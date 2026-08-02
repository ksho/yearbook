import { randomBytes, scrypt, ScryptOptions, timingSafeEqual } from 'node:crypto'

// The Node-only half of the gate. Kept apart from lib/gate.ts so that proxy.ts -- which may
// be built for the Edge runtime -- never pulls 'node:crypto' into its bundle. Only the API
// route that verifies a guess needs any of this.

// Hand-wrapped rather than promisify'd: scrypt is overloaded, and promisify resolves to the
// three-argument form, which leaves nowhere to pass the options object.
function derive(passphrase: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(passphrase, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

// N=32768 costs roughly 120ms of CPU and 33MB per attempt. That per-guess floor is the entire
// brute-force story: there is no attempt counter anywhere, because a high-entropy phrase plus
// an unavoidable eighth of a second per try already puts an online attack somewhere past the
// age of the universe. See CLAUDE.md for the arithmetic.
const N = 32768
const R = 8
const P = 1
const KEY_LENGTH = 64

// 128 * N * r comes to ~33.5MB, which is just over scrypt's 32MB default -- without raising
// this the call throws rather than running slowly.
const MAX_MEM = 128 * 1024 * 1024

const FORMAT = 'scrypt'

// ':' rather than the '$' that PHC-style hashes conventionally use. This value lives in an env
// var, and Next runs .env files through dotenv-expand -- '$k97sfhr...' gets read as a variable
// reference and silently replaced with nothing, so the hash arrives truncated and every
// correct passphrase is rejected. A colon can't appear in base64 and means nothing to a shell.
const SEPARATOR = ':'

// Unicode can spell the same phrase with different code points; normalising on both sides
// means a phrase typed on one keyboard still matches a hash generated on another.
const canonical = (passphrase: string) => passphrase.normalize('NFKC')

// Produces the value that goes in SITE_PASSPHRASE_HASH:
//   scrypt:32768:8:1:<salt-b64>:<hash-b64>
// Parameters travel with the hash so they can be raised later without invalidating the phrase.
export async function hashPassphrase(passphrase: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(canonical(passphrase), salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAX_MEM })

  return [FORMAT, N, R, P, salt.toString('base64'), key.toString('base64')].join(SEPARATOR)
}

export async function verifyPassphrase(passphrase: string, stored: string): Promise<boolean> {
  const parts = stored.split(SEPARATOR)
  if (parts.length !== 6 || parts[0] !== FORMAT) return false

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts
  const params = { N: Number(rawN), r: Number(rawR), p: Number(rawP), maxmem: MAX_MEM }

  if (!Number.isInteger(params.N) || !Number.isInteger(params.r) || !Number.isInteger(params.p)) {
    return false
  }

  const expected = Buffer.from(rawHash, 'base64')
  const salt = Buffer.from(rawSalt, 'base64')
  if (expected.length === 0 || salt.length === 0) return false

  let actual: Buffer
  try {
    actual = await derive(canonical(passphrase), salt, expected.length, params)
  } catch {
    // Malformed parameters in the env var, or a maxmem ceiling the stored N no longer fits.
    return false
  }

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
