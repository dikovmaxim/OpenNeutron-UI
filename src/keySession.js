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
    privateKeyCache = key

    try {
      const jwk = await crypto.subtle.exportKey('jwk', key)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(jwk))
    } catch (err) {
      sessionStorage.removeItem(SESSION_KEY)
      throw err
    }
  },
  get: async () => {
    if (privateKeyCache) {
      return privateKeyCache
    }

    const stored = sessionStorage.getItem(SESSION_KEY)
    if (!stored) {
      return null
    }

    try {
      const jwk = JSON.parse(stored)
      privateKeyCache = await importPrivateKey(jwk)
      return privateKeyCache
    } catch (err) {
      console.error('[keySession] Failed to restore private key from sessionStorage:', err)
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
  },
  clear: () => {
    privateKeyCache = null
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SALT_KEY)
  },
  setSalt: (salt) => sessionStorage.setItem(SALT_KEY, salt),
  getSalt: () => sessionStorage.getItem(SALT_KEY),
}
