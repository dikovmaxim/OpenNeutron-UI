import axios from 'axios'
import { storage } from './storage'

const api = axios.create({
  baseURL: 'http://openneutron.com:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  transformResponse: [
    (data) => {
      if (typeof data !== 'string') return data
      try {
        return JSON.parse(data.replace(/([,:\[]\s*)(\d{16,})/g, '$1"$2"'))
      } catch {
        return data
      }
    },
  ],
})

export const getUser = async () => {
  const token = storage.getToken()
  if (!token) return null
  try {
    const response = await api.get('/user/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    return null
  }
}

export default api