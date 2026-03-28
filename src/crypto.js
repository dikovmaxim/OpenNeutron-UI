
import { argon2id, bcrypt } from 'hash-wasm'

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

// Convert a 32-char hex salt string (16 bytes) to Uint8Array
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2)
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return arr
}

// Fixed 16-byte salt for auth hashing - security comes from bcrypt's work factor.
// ASCII: "OpenNeutronAuth1"
const AUTH_SALT = new Uint8Array([
  0x4f, 0x70, 0x65, 0x6e, 0x4e, 0x65, 0x75, 0x74,
  0x72, 0x6f, 0x6e, 0x41, 0x75, 0x74, 0x68, 0x31,
])

// Auth hash: bcrypt(password, fixed_salt, cost=10)
// Server stores the encoded bcrypt string and compares directly.
export async function hashPassword(password) {
  const enc = new TextEncoder()
  return bcrypt({
    password: enc.encode(password),
    salt: AUTH_SALT,
    costFactor: 10,
    outputType: 'encoded',
  })
}

// Derive 44 deterministic bytes from password+serverSalt:
// first 32 -> AES-256-GCM key, last 12 -> IV.
// bcrypt(password, salt) -> Argon2id(bcrypt_out, salt, 44 bytes)
async function deriveKeyMaterial(password, serverSalt) {
  const enc = new TextEncoder()
  const saltBytes = hexToBytes(serverSalt)
  const bcryptOut = await bcrypt({
    password: enc.encode(password),
    salt: saltBytes,
    costFactor: 10,
    outputType: 'binary',
  })
  return argon2id({
    password: bcryptOut,
    salt: saltBytes,
    iterations: 3,
    memorySize: 65536,
    hashLength: 44,
    parallelism: 1,
    outputType: 'binary',
  })
}

// Encrypt the private key deterministically - returns a plain base64 string.
// No random IV: key and IV are both derived from password + serverSalt.
export async function encryptPrivateKey(privateKey, password, serverSalt) {
  const material = await deriveKeyMaterial(password, serverSalt)
  const aesKey = await crypto.subtle.importKey('raw', material.slice(0, 32), { name: 'AES-GCM' }, false, ['encrypt'])
  const iv = material.slice(32, 44)
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, pkcs8)
  return toB64(encrypted)
}

// Decrypt the private key. encryptedKey is a plain base64 string.
export async function decryptPrivateKey(encryptedKey, password, serverSalt) {
  const material = await deriveKeyMaterial(password, serverSalt)
  const aesKey = await crypto.subtle.importKey('raw', material.slice(0, 32), { name: 'AES-GCM' }, false, ['decrypt'])
  const iv = material.slice(32, 44)
  try {
    const pkcs8 = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      fromB64(typeof encryptedKey === 'string' ? encryptedKey : encryptedKey.data),
    )
    return crypto.subtle.importKey(
      'pkcs8', pkcs8, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['decrypt'],
    )
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

// Encrypt plaintext for a recipient's public key.
// Returns { aes_encrypted, data_encrypted } - both plain base64 strings.
//   aes_encrypted  = Base64(RSA-OAEP(K))          - encrypted AES key
//   data_encrypted = Base64(nonce || ciphertext || GCM-tag)
export async function encryptEmail(plaintext, publicKey) {
  const iv     = crypto.getRandomValues(new Uint8Array(12))
  const aesRaw = crypto.getRandomValues(new Uint8Array(32))
  const aesKey = await crypto.subtle.importKey('raw', aesRaw, { name: 'AES-GCM' }, false, ['encrypt'])
  const enc = new TextEncoder()
  const aesCipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc.encode(plaintext))
  const rsaCipher = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, aesRaw)
  const dataOut = new Uint8Array(12 + aesCipher.byteLength)
  dataOut.set(iv, 0)
  dataOut.set(new Uint8Array(aesCipher), 12)
  return {
    aes_encrypted:  toB64(rsaCipher),
    data_encrypted: toB64(dataOut.buffer),
  }
}

// Decrypt an email received from the server.
//   data       = Base64(nonce || ciphertext || GCM-tag)  (from email.data)
//   messageKey = Base64(RSA-OAEP-encrypted AES key)      (from email.message_key)
//   privateKey = CryptoKey (RSA-OAEP private)
// When messageKey is absent the data is assumed to be raw (unencrypted) bytes.
export async function decryptEmail(data, messageKey, privateKey) {
  if (!messageKey) {
    return new TextDecoder().decode(new Uint8Array(fromB64(data)))
  }
  const aesRaw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, fromB64(messageKey))
  const aesKey = await crypto.subtle.importKey('raw', aesRaw, { name: 'AES-GCM' }, false, ['decrypt'])
  const dataBuf = new Uint8Array(fromB64(data))
  const iv         = dataBuf.slice(0, 12)
  const ciphertext = dataBuf.slice(12)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext)
  return new TextDecoder().decode(plain)
}
