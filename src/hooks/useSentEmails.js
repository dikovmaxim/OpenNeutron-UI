import { useState, useRef, useCallback } from 'react'
import { storage } from '@/storage'
import { keySession } from '@/keySession'
import api from '@/api'
import { decryptEmail } from '@/crypto'
import { parseEmail } from '@/emailParser'

export function useSentEmails(setPreviews) {
  const [sentUids, setSentUids] = useState(() => storage.getSentUids())
  const isFetchingSentRef = useRef(false)

  const fetchSentUids = useCallback(async () => {
    try {
      const token = storage.getToken()
      const res = await api.post(
        '/email/sent/recent',
        { offset: 0, limit: 200 },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const uids = (res.data.uids ?? []).map(String)
      setSentUids(uids)
      storage.setSentUids(uids)
      return uids
    } catch {
      return []
    }
  }, [])

  const fetchSentPreviews = useCallback(async (uids) => {
    if (!uids.length || isFetchingSentRef.current) return
    isFetchingSentRef.current = true
    try {
      const token = storage.getToken()
      const bulkRes = await api.post(
        '/email/sent/bulk',
        `{"uids":[${uids.join(',')}]}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const privateKey = await keySession.get()
      const newPreviews = {}
      await Promise.all(
        bulkRes.data.emails.map(async ({ uid, data, received_at }) => {
          try {
            if (!privateKey) {
              newPreviews[uid] = { subject: '(key unavailable)', from: null, date: null, preview: '', attachments: [] }
              return
            }
            const text = await decryptEmail(data, privateKey)
            const parsed = parseEmail(text)
            newPreviews[uid] = {
              subject:     parsed?.subject     ?? '(no subject)',
              from:        parsed?.from        ?? null,
              date:        parsed?.date        ?? (received_at ? new Date(received_at) : null),
              preview:     parsed?.preview     ?? '',
              attachments: parsed?.attachments ?? [],
              e2ee:        parsed?.e2ee        ?? false,
            }
          } catch {
            newPreviews[uid] = { subject: '(encrypted)', from: null, date: received_at ? new Date(received_at) : null, preview: '', attachments: [], decryptFailed: true }
          }
        }),
      )
      setPreviews((prev) => ({ ...prev, ...newPreviews }))
    } catch {}
    finally {
      isFetchingSentRef.current = false
    }
  }, [setPreviews])

  return { sentUids, setSentUids, fetchSentUids, fetchSentPreviews }
}
