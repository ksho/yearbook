import type { NextApiRequest, NextApiResponse } from 'next'

import { SESSION_MAX_AGE_SECONDS, sessionCookie, sessionEpoch, signSession } from '../../lib/gate'
import { verifyPassphrase } from '../../lib/passphrase'

// POST a passphrase to get a session cookie; DELETE to give it back.
//
// This is the only route the proxy lets through unauthenticated, so it is the only surface a
// guesser can reach. Nothing here ever logs or echoes what was typed.

// Every response takes at least this long, right or wrong. scrypt already dominates the
// timing, so this is mostly belt-and-braces against a timing signal -- but it also caps a
// single client at under two attempts a second without needing a counter anywhere.
const MIN_RESPONSE_MS = 600

// Well past any real phrase, and short enough that a huge body can't turn scrypt into a
// CPU sink.
const MAX_PASSPHRASE_LENGTH = 200

export const config = {
  api: {
    bodyParser: { sizeLimit: '4kb' },
  },
}

async function settle(startedAt: number) {
  const remaining = MIN_RESPONSE_MS - (Date.now() - startedAt)
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining))
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', sessionCookie('', 0))
    return res.status(200).json({ ok: true })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, DELETE')
    return res.status(405).json({ ok: false })
  }

  const startedAt = Date.now()

  const secret = process.env.SESSION_SECRET
  const stored = process.env.SITE_PASSPHRASE_HASH

  if (!secret || !stored) {
    // Vague to the caller, specific in the server log.
    console.error('Gate cannot run: SESSION_SECRET or SITE_PASSPHRASE_HASH is missing.')
    await settle(startedAt)
    return res.status(503).json({ ok: false })
  }

  const submitted: unknown = req.body?.passphrase
  const passphrase = typeof submitted === 'string' ? submitted : ''

  if (!passphrase || passphrase.length > MAX_PASSPHRASE_LENGTH || !(await verifyPassphrase(passphrase, stored))) {
    await settle(startedAt)
    // One generic failure for every cause. No hints, no "close", no partial matches.
    return res.status(401).json({ ok: false })
  }

  res.setHeader(
    'Set-Cookie',
    sessionCookie(await signSession(secret, sessionEpoch()), SESSION_MAX_AGE_SECONDS)
  )
  await settle(startedAt)

  return res.status(200).json({ ok: true })
}
