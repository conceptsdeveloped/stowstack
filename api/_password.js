import crypto from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(crypto.scrypt)

const SCRYPT_KEYLEN = 64
const SCRYPT_COST = 16384 // N
const SCRYPT_BLOCK_SIZE = 8 // r
const SCRYPT_PARALLELIZATION = 1 // p

/**
 * Hash a password using scrypt (Node built-in, no native deps).
 * Returns "scrypt:<salt_hex>:<hash_hex>"
 */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = await scryptAsync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  })
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`
}

/**
 * Verify a password against a stored hash.
 * Supports both scrypt (new) and legacy SHA-256 (old) formats.
 *
 * @param {string} password - plaintext password
 * @param {string} stored - stored hash string
 * @param {string} userId - user ID (needed for legacy SHA-256 format)
 * @returns {{ valid: boolean, needsRehash: boolean }}
 */
export async function verifyPassword(password, stored, userId) {
  if (!stored || !password) return { valid: false, needsRehash: false }

  // New scrypt format: "scrypt:<salt>:<hash>"
  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':')
    if (parts.length !== 3) return { valid: false, needsRehash: false }
    const salt = Buffer.from(parts[1], 'hex')
    const storedHash = Buffer.from(parts[2], 'hex')
    const hash = await scryptAsync(password, salt, SCRYPT_KEYLEN, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
    })
    return { valid: crypto.timingSafeEqual(hash, storedHash), needsRehash: false }
  }

  // Legacy SHA-256 format: hex string = sha256(password + userId)
  const legacyHash = crypto.createHash('sha256').update(password + userId).digest('hex')
  const valid = crypto.timingSafeEqual(Buffer.from(legacyHash, 'hex'), Buffer.from(stored, 'hex'))
  return { valid, needsRehash: valid } // if valid, needs rehash to scrypt
}
