
function toB64(buffer) {
  const bytes = new Uint8Array(buffer)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function fromB64(b64) {
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

export async function generateKeyPair() {
  const kp = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  )
  return kp
}

export async function exportPublicKeyBase64(publicKey) {
  const spki = await crypto.subtle.exportKey('spki', publicKey)
  const b64 = toB64(spki)
  return b64
}

export async function encryptPrivateKey(privateKey, password) {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'],
  )
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )

  const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, pkcs8)

  return { salt: toB64(salt), iv: toB64(iv), data: toB64(encrypted) }
}

export async function hashPassword(password) {
  const enc = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(password))
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function decryptPrivateKey(encryptedKey, password) {
  const enc = new TextEncoder()
  const { salt, iv, data } = encryptedKey
  try {
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'],
    )
    const aesKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: fromB64(salt), iterations: 100_000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )
    const pkcs8 = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(iv) },
      aesKey,
      fromB64(data),
    )
    const privateKey = await crypto.subtle.importKey(
      'pkcs8', pkcs8, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['decrypt'],
    )
    return privateKey
  } catch (err) {
    throw err
  }
}

export async function getPublicCryptoKeyFromPrivate(privateKey) {
  const jwk = await crypto.subtle.exportKey('jwk', privateKey)
  const pubJwk = { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg, ext: true, key_ops: ['encrypt'] }
  return crypto.subtle.importKey('jwk', pubJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt'])
}

export async function importPublicKeyBase64(base64) {
  const der = fromB64(base64)
  return crypto.subtle.importKey('spki', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt'])
}

export async function hashPublicKey(publicKeyBase64) {
  const spki = fromB64(publicKeyBase64)
  const hash = await crypto.subtle.digest('SHA-256', spki)
  return toB64(hash)
}

export async function exportPublicKeyFromPrivate(privateKey) {
  const jwk = await crypto.subtle.exportKey('jwk', privateKey)
  const pubJwk = { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg, ext: true, key_ops: ['encrypt'] }
  const pubKey = await crypto.subtle.importKey(
    'jwk', pubJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt'],
  )
  const spki = await crypto.subtle.exportKey('spki', pubKey)
  return toB64(spki)
}

const LEN_PREFIX_SIZE = 4

export async function decryptEmail(base64Data, privateKey) {
  const buf = new Uint8Array(fromB64(base64Data))

  // Heuristic: if the data is valid UTF-8 text (no encrypted prefix structure),
  // it was never encrypted — return as-is.
  if (buf.length < LEN_PREFIX_SIZE + 4) {
    return new TextDecoder().decode(buf)
  }

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const rsaLen = view.getUint32(0, false)

  // If rsaLen looks unreasonable it's probably plain text
  if (rsaLen === 0 || rsaLen > buf.length - LEN_PREFIX_SIZE) {
    return new TextDecoder().decode(buf)
  }

  let off = LEN_PREFIX_SIZE
  const rsaCipher = buf.slice(off, off + rsaLen);  off += rsaLen
  const iv        = buf.slice(off, off + 12);       off += 12
  const aesCipher = buf.slice(off)

  // This will throw if the key is wrong or data is corrupted — callers must handle it
  const aesRaw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, rsaCipher)
  const aesKey = await crypto.subtle.importKey('raw', aesRaw, { name: 'AES-GCM' }, false, ['decrypt'])
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, aesCipher)
  return new TextDecoder().decode(plain)
}

export async function encryptEmail(plaintext, publicKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const aesRaw = crypto.getRandomValues(new Uint8Array(32))
  const aesKey = await crypto.subtle.importKey('raw', aesRaw, { name: 'AES-GCM' }, false, ['encrypt'])
  const enc = new TextEncoder()
  const aesCipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc.encode(plaintext))
  const rsaCipher = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, aesRaw)
  const rsaLen = rsaCipher.byteLength
  const out = new Uint8Array(LEN_PREFIX_SIZE + rsaLen + 12 + aesCipher.byteLength)
  const view = new DataView(out.buffer)
  view.setUint32(0, rsaLen, false)
  out.set(new Uint8Array(rsaCipher), LEN_PREFIX_SIZE)
  out.set(iv, LEN_PREFIX_SIZE + rsaLen)
  out.set(new Uint8Array(aesCipher), LEN_PREFIX_SIZE + rsaLen + 12)
  return toB64(out.buffer)
}
