import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/api'
import { storage } from '@/storage'
import { hashPassword, decryptPrivateKey, generateKeyPair, exportPublicKeyBase64, encryptPrivateKey } from '@/crypto'
import { keySession } from '@/keySession'

const Login = () => {
  const [phase, setPhase] = useState('login')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [setupPassword, setSetupPassword] = useState('')
  const [setupConfirm, setSetupConfirm] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const passwordHash = await hashPassword(password)
      const response = await api.post('/auth/login', { username, password: passwordHash })
      const { token, force_reset, username: name, public_key, salt, encrypted_private_key } = response.data

      if (storage.getUsername() !== name) {
        keySession.clear()
      }

      storage.set({ token, force_reset, username: name })
      if (public_key) storage.set({ public_key })
      if (salt) keySession.setSalt(salt)

      if (force_reset) {
        setPhase('setup')
        return
      }

      const encryptedKey = encrypted_private_key
      if (!encryptedKey) {
        setError('No encrypted key returned by server')
        return
      }

      storage.set({ encrypted_key: encryptedKey })

      try {
        const privateKey = await decryptPrivateKey(encryptedKey, password, salt)
        await keySession.set(privateKey)
      } catch (err) {
        setError('Failed to decrypt private key - wrong password or corrupted key')
        return
      }

      navigate('/')
    } catch (err) {
      setError('Invalid credentials')
    }
  }

  const handleSetup = async (e) => {
    e.preventDefault()
    if (setupPassword !== setupConfirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      const currentUsername = storage.getUsername()
      const serverSalt = keySession.getSalt()
      const keyPair = await generateKeyPair()
      const publicKeyBase64 = await exportPublicKeyBase64(keyPair.publicKey)
      const encryptedKey = await encryptPrivateKey(keyPair.privateKey, setupPassword, serverSalt)
      const passwordHash = await hashPassword(setupPassword)

      let activeToken = storage.getToken()

      try {
        await api.post(
          '/user/setup',
          { password: passwordHash, public_key: publicKeyBase64, encrypted_private_key: encryptedKey },
          { headers: { Authorization: `Bearer ${activeToken}` } },
        )
      } catch (setupErr) {
        if (setupErr.response?.status !== 409) throw setupErr

        await api.delete('/admin/users', {
          data: { username: currentUsername },
          headers: { Authorization: `Bearer ${activeToken}` },
        })
        await api.post('/admin/users', { username: currentUsername }, {
          headers: { Authorization: `Bearer ${activeToken}` },
        })
        const loginRes = await api.post('/auth/login', {
          username: currentUsername,
          password: passwordHash,
        })
        activeToken = loginRes.data.token
        if (loginRes.data.salt) keySession.setSalt(loginRes.data.salt)
        storage.set({ token: activeToken })
        await api.post(
          '/user/setup',
          { password: passwordHash, public_key: publicKeyBase64, encrypted_private_key: encryptedKey },
          { headers: { Authorization: `Bearer ${activeToken}` } },
        )
      }

      await keySession.set(keyPair.privateKey)
      storage.set({ encrypted_key: encryptedKey, public_key: publicKeyBase64, force_reset: false })
      navigate('/')
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Key recovery requires admin privileges. Ask your administrator to delete and recreate your account.')
      } else {
        setError(`Setup failed: ${err.response?.data?.error || err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (phase === 'setup') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Setup Account</CardTitle>
            <CardDescription>
              Choose a password to secure your account and generate your encryption keys.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label htmlFor="setup-password" className="block text-sm font-medium mb-1">Password</label>
                <Input
                  id="setup-password"
                  type="password"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  required
                />

              </div>
              <div>
                <label htmlFor="setup-confirm" className="block text-sm font-medium mb-1">Re-enter Password</label>
                <Input
                  id="setup-confirm"
                  type="password"
                  value={setupConfirm}
                  onChange={(e) => setSetupConfirm(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Generating keys…' : 'Setup Account'}
              </Button>
              {loading && (
                <p className="text-xs text-gray-400 text-center">
                  Generating RSA-4096 key pair, this may take a moment…
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to access the app</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">Username</label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full">Login</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login