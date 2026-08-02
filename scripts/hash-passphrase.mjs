#!/usr/bin/env node
//
// Generates the value for SITE_PASSPHRASE_HASH.
//
//   node scripts/hash-passphrase.mjs "correct horse battery staple twelve"
//
// Standalone on purpose: it has to run with plain `node`, before any build, so it can't
// import the TypeScript in lib/passphrase.ts. The four parameters below are duplicated from
// that file -- if you raise them there, raise them here too, or freshly generated hashes will
// verify more slowly (or not at all) than the ones already deployed.

import { randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

const N = 32768
const R = 8
const P = 1
const KEY_LENGTH = 64
const MAX_MEM = 128 * 1024 * 1024

const passphrase = process.argv[2]

if (!passphrase) {
  console.error('usage: node scripts/hash-passphrase.mjs "<passphrase>"')
  console.error('')
  console.error('Use five randomly chosen words, not a sentence you made up -- the entropy of')
  console.error('the phrase is what actually keeps the site shut.')
  process.exit(1)
}

const salt = randomBytes(16)
const key = await scryptAsync(passphrase.normalize('NFKC'), salt, KEY_LENGTH, {
  N,
  r: R,
  p: P,
  maxmem: MAX_MEM,
})

// ':' as the separator, not the conventional '$' -- see the note in lib/passphrase.ts. In
// short: Next expands '$name' inside .env files, which quietly truncates the hash.
console.log([`scrypt`, N, R, P, salt.toString('base64'), key.toString('base64')].join(':'))
