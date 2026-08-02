import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { SESSION_COOKIE, gateDisabled, sessionEpoch, verifySession } from './lib/gate'

// The single choke point for the passphrase gate. Everything the matcher covers -- the home
// page, every album, every API route -- is unreachable without a valid session cookie.
//
// Gating here rather than inside each getServerSideProps matters for more than tidiness: the
// proxy runs first, so an unauthenticated request never reaches the S3 listing in
// lib/photos.ts. No AWS calls, no bucket keys in a response, nothing to leak.
//
// (Next 16 renamed middleware.ts to proxy.ts; this file is that, under its new name.)

export const config = {
  matcher: [
    /*
     * Everything except:
     *   enter        the gate page itself
     *   api/gate     the endpoint that issues the cookie
     *   _next/*      build output and the image optimizer
     *   favicon.ico, robots.txt, vercel.svg
     *                files a browser or crawler asks for by name, and which give nothing away
     */
    '/((?!enter|api/gate|_next/static|_next/image|favicon\\.ico|robots\\.txt|vercel\\.svg).*)',
  ],
}

// Announced once per instance rather than per request, so the reason the site is wide open is
// sitting in the Vercel logs without paying to log it on every hit.
if (gateDisabled()) {
  console.warn('SITE_GATE_DISABLED=true -- the passphrase gate is OFF and this site is public.')
}

export default async function proxy(request: NextRequest) {
  // Checked before anything else, deliberately. The kill switch has to work even when the
  // thing that broke is the configuration below it -- a truncated hash or a missing secret is
  // exactly the sort of failure you would be reaching for this to escape.
  if (gateDisabled()) {
    return NextResponse.next()
  }

  const secret = process.env.SESSION_SECRET

  // Failing open here would silently un-gate the entire site the first time someone forgets
  // an env var on a fresh Vercel environment, and nothing about the page would look wrong.
  // Fail closed and make it obvious instead -- turning the gate off is what the kill switch
  // above is for, and it says so out loud.
  if (!secret) {
    return new NextResponse('The gate is misconfigured.', { status: 503 })
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value
  if (await verifySession(cookie, secret, sessionEpoch())) {
    return NextResponse.next()
  }

  const gate = new URL('/enter', request.url)

  // Deep links survive the detour: /album/2025 comes back to /album/2025, not the home page.
  const from = request.nextUrl.pathname + request.nextUrl.search
  if (from !== '/') gate.searchParams.set('next', from)

  return NextResponse.redirect(gate, 307)
}
