import { useState, useRef, useCallback } from 'react'
import { storage } from '@/storage'
import { keySession } from '@/keySession'
import api from '@/api'
import { decryptEmail } from '@/crypto'
import { parseEmail } from '@/emailParser'

const LIMIT = 20

export function useEmailFetch() {
  const [uids, setUids] = useState([])
  const [previews, setPreviews] = useState({})
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const isFetchingRef = useRef(false)

  const fetchEmails = useCallback(async (currentOffset) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    setLoading(true)
    try {
      const token = storage.getToken()
      const res = await api.post(
        '/email/recent',
        { offset: currentOffset, limit: LIMIT },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const newUids = res.data.uids
      setUids((prev) => (currentOffset === 0 ? newUids : [...prev, ...newUids]))
      setHasMore(newUids.length === LIMIT)
      if (newUids.length > 0) {
        const bulkRes = await api.post(
          '/email/bulk',
          `{"uids":[${newUids.join(',')}]}`,
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
              }
            } catch {
              newPreviews[uid] = { subject: '(decryption failed)', from: null, date: null, preview: '', attachments: [] }
            }
          }),
        )
        setPreviews((prev) => ({ ...prev, ...newPreviews }))
      }
    } catch {}
    finally {
      isFetchingRef.current = false
      setLoading(false)
    }
  }, [])

  const loadMore = () => {
    if (isFetchingRef.current || !hasMore) return
    const next = offset + LIMIT
    setOffset(next)
    fetchEmails(next)
  }

  return { uids, setUids, previews, setPreviews, loading, hasMore, fetchEmails, loadMore }
}
