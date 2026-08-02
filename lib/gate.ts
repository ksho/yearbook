// Plumbing for the passphrase gate: the session cookie's format, its signature, and the
// validation of the ?next= parameter.
//
// This module is imported from two places with different crypto available -- pages/api/gate.ts
// (Node) issues the cookie, and proxy.ts checks it on every single request, where Next may
// build for either the Node or the Edge runtime. Web Crypto is the only API present in both,
// so everything here goes through crypto.subtle. Nothing in here may import 'node:crypto';
// the scrypt half of the gate lives in lib/passphrase.ts precisely so that this file stays
// runtime-agnostic.

export const SESSION_COOKIE = 'yb_session'

// Six months. This is a family photo album, not a bank -- being asked for the phrase twice a
// year is about the right amount of friction.
export const SESSION_MAX_AGE_SECONDS = 180 * 24 * 60 * 60

interface SessionPayload {
  // Unix seconds. Checked on our side rather than trusting the cookie's Max-Age, which lives
  // on the client and can simply be edited.
  exp: number
  // Mirrors the SESSION_EPOCH env var. Bumping that number invalidates every cookie already
  // out in the world without touching the passphrase -- the "log everyone out" lever, kept
  // separate from the "change the phrase" lever.
  epoch: number
}

const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Returns null rather than throwing on malformed input -- every caller here is handling a
// cookie the client could have scribbled on, so bad input is expected, not exceptional.
// The return type is left to inference: annotating it as Uint8Array widens the buffer to
// ArrayBufferLike, which crypto.subtle won't accept.
function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')

  let binary: string
  try {
    binary = atob(padded)
  } catch {
    return null
  }

  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

// The kill switch. If the gate itself turns out to be broken -- a bad hash in an env var, a
// bug in here, anything that locks the family out -- this reopens the site without reverting
// code.
//
// Two deliberate properties. It fails safe: absence, an empty string, a typo, 'yes', '1' all
// leave the gate ON, and only the exact word 'true' turns it off, so nothing accidental can
// expose the site. And it is short and obvious to type, because the moment you need it is the
// moment you are least inclined to look up the spelling.
//
// Read fresh on each call rather than captured at module load, so a `next dev` picking up an
// edited .env.local takes effect without a restart.
export function gateDisabled(): boolean {
  return process.env.SITE_GATE_DISABLED?.trim().toLowerCase() === 'true'
}

export function sessionEpoch(): number {
  const parsed = Number.parseInt(process.env.SESSION_EPOCH ?? '1', 10)
  return Number.isFinite(parsed) ? parsed : 1
}

export async function signSession(secret: string, epoch: number): Promise<string> {
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    epoch,
  }

  const body = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body))

  return `${body}.${toBase64Url(new Uint8Array(signature))}`
}

export async function verifySession(
  cookie: string | undefined,
  secret: string,
  epoch: number
): Promise<boolean> {
  if (!cookie) return false

  const dot = cookie.indexOf('.')
  if (dot < 1) return false

  const body = cookie.slice(0, dot)

  const signature = fromBase64Url(cookie.slice(dot + 1))
  if (!signature) return false

  // subtle.verify compares in constant time, so a forged signature gives away nothing by
  // how long it takes to reject.
  const signed = await crypto.subtle.verify('HMAC', await hmacKey(secret), signature, encoder.encode(body))
  if (!signed) return false

  const decoded = fromBase64Url(body)
  if (!decoded) return false

  // Only parsed once the signature has held up, so this is our own JSON, not the client's.
  let payload: SessionPayload
  try {
    payload = JSON.parse(new TextDecoder().decode(decoded))
  } catch {
    return false
  }

  if (payload.epoch !== epoch) return false

  return payload.exp > Math.floor(Date.now() / 1000)
}

export function sessionCookie(value: string, maxAgeSeconds: number): string {
  const parts = [`${SESSION_COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`]

  // localhost is plain http, and browsers silently drop a Secure cookie there -- which would
  // make the gate impossible to get past in development.
  if (process.env.NODE_ENV === 'production') parts.push('Secure')

  return parts.join('; ')
}

// Only same-origin, absolute-from-root paths are honoured. Rejects '//evil.example' and
// '/\evil.example' (both protocol-relative to some parsers) and anything carrying a scheme,
// so ?next= can't be used to bounce a family member onto someone else's site.
export function safeNextPath(value: string | string[] | undefined | null): string {
  const raw = Array.isArray(value) ? value[0] : value

  if (!raw || !raw.startsWith('/')) return '/'
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/'

  return raw
}
