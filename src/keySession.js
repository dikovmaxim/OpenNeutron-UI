const SESSION_KEY = 'openneutron.private_key_jwk'
const SALT_KEY = 'openneutron.salt'

let privateKeyCache = null

async function importPrivateKey(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt'],
  )
}

export const keySession = {
  set: async (key) => {
    console.log('[keySession] set() called — storing private key in memory + sessionStorage')
    privateKeyCache = key

    try {
      const jwk = await crypto.subtle.exportKey('jwk', key)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(jwk))
      console.log('[keySession] ✅ Private key persisted to sessionStorage')
    } catch (err) {
      sessionStorage.removeItem(SESSION_KEY)
      console.error('[keySession] ❌ Failed to persist key to sessionStorage:', err)
      throw err
    }
  },
  get: async () => {
    if (privateKeyCache) {
      console.log('[keySession] get() — returning in-memory cached key')
      return privateKeyCache
    }

    const stored = sessionStorage.getItem(SESSION_KEY)
    console.log('[keySession] get() — cache miss, sessionStorage has key:', !!stored)
    if (!stored) {
      console.warn('[keySession] ⚠️ No private key in sessionStorage — user may need to re-login')
      return null
    }

    try {
      const jwk = JSON.parse(stored)
      privateKeyCache = await importPrivateKey(jwk)
      console.log('[keySession] ✅ Private key restored from sessionStorage')
      return privateKeyCache
    } catch (err) {
      console.error('[keySession] ❌ Failed to restore private key from sessionStorage:', err)
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
  },
  clear: () => {
    console.log('[keySession] clear() called — wiping memory + sessionStorage')
    privateKeyCache = null
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SALT_KEY)
  },
  setSalt: (salt) => {
    console.log('[keySession] setSalt():', salt)
    sessionStorage.setItem(SALT_KEY, salt)
  },
  getSalt: () => sessionStorage.getItem(SALT_KEY),
}
