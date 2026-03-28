import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  Minus,
  Send,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Trash2,
} from 'lucide-react'
import api from '@/api'
import { storage } from '@/storage'
import { keySession } from '@/keySession'
import { encryptEmail, getPublicCryptoKeyFromPrivate, importPublicKeyBase64, hashPublicKey } from '@/crypto'
import { buildEmail } from '@/lib/emailBuilder'
import { MAX_ATTACHMENT_BYTES, readFileAsBase64, utf8ToBase64, formatBytes } from '@/lib/mime'
import { isValidEmail } from '@/lib/utils'
import { AddressField } from '@/components/compose/AddressField'
import { AttachmentChip } from '@/components/compose/AttachmentChip'

const ComposeWindow = ({ myEmail, onClose, onSent, replyData = null, draftId = null, onDeleteDraft }) => {
  const [minimized, setMinimized] = useState(false)

  const currentDraftId = useRef(draftId ?? ('draft_' + Date.now()))

  const [toChips,  setToChips]  = useState(() => replyData?.to  ?? [])
  const [ccChips,  setCcChips]  = useState(() => replyData?.cc  ?? [])
  const [bccChips, setBccChips] = useState(() => replyData?.bcc ?? [])
  const [subject,  setSubject]  = useState(() => replyData?.subject ?? '')
  const [body,     setBody]     = useState(() => replyData?.body ?? '')

  const [attachments, setAttachments] = useState([])
  const [isDragOver,  setIsDragOver]  = useState(false)
  const fileInputRef = useRef(null)

  const [sendState,   setSendState]   = useState('idle')
  const [sendError,   setSendError]   = useState('')
  const [sendResults, setSendResults] = useState([])

  const buildDraft = useCallback(() => ({
    id:        currentDraftId.current,
    to:        toChips,
    cc:        ccChips,
    bcc:       bccChips,
    subject,
    body,
    updatedAt: Date.now(),
  }), [toChips, ccChips, bccChips, subject, body])

  const handleClose = useCallback(() => {
    const hasContent = toChips.length > 0 || subject.trim() || body.trim() || attachments.length > 0
    if (hasContent && sendState !== 'done') {
      onClose(buildDraft())
    } else {
      onClose(null)
    }
  }, [toChips, subject, body, attachments, sendState, buildDraft, onClose])

  const handleDiscard = useCallback(() => {
    if (draftId) onDeleteDraft?.(draftId)
    onClose(null)
  }, [draftId, onDeleteDraft, onClose])

  const windowRef   = useRef(null)
  const isResizing  = useRef(false)
  const resizeDir   = useRef('nw')
  const resizeStart = useRef({})
  const [size, setSize] = useState({ w: 520, h: 420 })

  const addFiles = useCallback((files) => {
    const oversized = []
    const toAdd     = []

    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        oversized.push(`"${file.name}" (${formatBytes(file.size)})`)
        continue
      }
      toAdd.push({
        id:        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name:      file.name,
        size:      file.size,
        type:      file.type,
        file,
        status:    'loading',
        data:      null,
        readError: null,
      })
    }

    if (oversized.length > 0) {
      setSendError(
        `${oversized.length === 1 ? 'File exceeds' : 'Files exceed'} the 20 MB limit: ${oversized.join(', ')}`,
      )
      setSendState('error')
    }

    if (toAdd.length === 0) return

    setAttachments((prev) => [...prev, ...toAdd])

    for (const att of toAdd) {
      readFileAsBase64(att.file)
        .then((data) => {
          setAttachments((prev) =>
            prev.map((a) => (a.id === att.id ? { ...a, status: 'ready', data } : a)),
          )
        })
        .catch((err) => {
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === att.id ? { ...a, status: 'error', readError: err.message } : a,
            ),
          )
        })
    }
  }, [])

  const handleResizeMouseDown = (e, dir) => {
    e.preventDefault()
    e.stopPropagation()
    isResizing.current  = true
    resizeDir.current   = dir
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h }
  }

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isResizing.current) return
      const dir = resizeDir.current
      const dx  = resizeStart.current.x - e.clientX
      const dy  = resizeStart.current.y - e.clientY
      setSize({
        w: dir === 'n' ? resizeStart.current.w : Math.max(380, resizeStart.current.w + dx),
        h: dir === 'w' ? resizeStart.current.h : Math.max(300, resizeStart.current.h + dy),
      })
    }
    const onMouseUp = () => { isResizing.current = false }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
  }, [])

  const handleSend = async () => {
    const allTo  = toChips.filter((a) => a.trim())
    const allCc  = ccChips.filter((a) => a.trim())
    const allBcc = bccChips.filter((a) => a.trim())
    const allRecipients = [...allTo, ...allCc, ...allBcc]

    if (allTo.length === 0) {
      setSendError('Add at least one recipient in the To field.')
      setSendState('error')
      return
    }
    const invalid = allRecipients.filter((a) => !isValidEmail(a))
    if (invalid.length > 0) {
      setSendError(`Invalid address${invalid.length > 1 ? 'es' : ''}: ${invalid.join(', ')}`)
      setSendState('error')
      return
    }

    const loadingFiles = attachments.filter((a) => a.status === 'loading')
    if (loadingFiles.length > 0) {
      setSendError(
        `${loadingFiles.length} attachment${loadingFiles.length > 1 ? 's are' : ' is'} still loading — please wait.`,
      )
      setSendState('error')
      return
    }
    const failedFiles = attachments.filter((a) => a.status === 'error')
    if (failedFiles.length > 0) {
      setSendError(
        `Remove failed attachment${failedFiles.length > 1 ? 's' : ''} before sending: ${failedFiles.map((a) => a.name).join(', ')}`,
      )
      setSendState('error')
      return
    }

    setSendError('')
    setSendState('resolving')

    try {
      const token   = storage.getToken()
      const headers = { Authorization: `Bearer ${token}` }

      console.log('requestnig keys for users', allRecipients)
      setSendState('fetchingkeys')
      const resolveRes = await api.post(
        '/email/publickeys',
        { addresses: allRecipients },
        { headers },
      )
      const keyMap = Object.fromEntries(
        resolveRes.data.keys.map((k) => [k.address, k.public_key]),
      )
      console.log('got the keys', keyMap)

      setSendState('encrypting')

      const hasAnyKey = allRecipients.some((addr) => !!keyMap[addr])

      const rawEmail = buildEmail({
        from:        myEmail,
        to:          allTo,
        cc:          allCc,
        subject,
        body,
        attachments: attachments.map(({ name, type, data }) => ({ name, type, data })),
        inReplyTo:   replyData?.inReplyTo ?? '',
        references:  replyData?.references ?? '',
        e2ee:        hasAnyKey,
      })

      const privateKey = await keySession.get()
      if (!privateKey) throw new Error('Session expired — please log in again.')

      const myPublicKey   = await getPublicCryptoKeyFromPrivate(privateKey)
      const localCopyData = await encryptEmail(rawEmail, myPublicKey)

      let publicKeyHash = ''
      const storedPubKey = storage.getPublicKey()
      if (storedPubKey) publicKeyHash = await hashPublicKey(storedPubKey)

      const recipientsPayload = {}
      for (const addr of allRecipients) {
        const recipientKeyB64 = keyMap[addr]
        if (recipientKeyB64) {
          const recipientKey = await importPublicKeyBase64(recipientKeyB64)
          const encrypted = await encryptEmail(rawEmail, recipientKey)
          console.log('encrypted with', addr, 'key available')
          recipientsPayload[addr] = { data: encrypted, e2ee: true }
        } else {
          console.log('encrypted with', addr, 'no key, plaintext base64')
          recipientsPayload[addr] = { data: utf8ToBase64(rawEmail), e2ee: false }
        }
      }

      setSendState('sending')

      console.log('sending payload to /email/sendencrypted', { localcopy: { e2ee: true }, recipients: Object.keys(recipientsPayload) })
      const res = await api.post(
        '/email/sendencrypted',
        {
          localcopy: {
            to:              allRecipients,
            timestamp:       Math.floor(Date.now() / 1000),
            public_key_hash: publicKeyHash,
            raw_data:        localCopyData,
            e2ee:            true,
          },
          recipients: recipientsPayload,
        },
        { headers },
      )

      console.log('sent ith', res.data)
      if (res.data.sent_email_uid) storage.addSentUid(res.data.sent_email_uid)
      if (draftId) onDeleteDraft?.(draftId)

      setSendResults(res.data.delivery_results ?? [])
      setSendState('done')
      if (onSent) onSent(res.data.sent_email_uid)
      setTimeout(() => onClose(null), 2000)
    } catch (err) {
      setSendError(err.response?.data?.error ?? err.message ?? 'Send failed. Please try again.')
      setSendState('error')
    }
  }

  const isSending       = ['resolving', 'fetchingkeys', 'encrypting', 'sending'].includes(sendState)
  const hasLoadingFiles = attachments.some((a) => a.status === 'loading')
  const isSendBlocked   = isSending || sendState === 'done'

  const sendStatusLabel = {
    resolving:    'Resolving…',
    fetchingkeys: 'Fetching recipient keys…',
    encrypting:   'Encrypting…',
    sending:      'Sending…',
    done:         'Sent!',
    error:        sendError,
  }[sendState]

  return (
    <div
      ref={windowRef}
      className="fixed z-50 flex flex-col bg-background border border-border rounded-t-lg shadow-2xl"
      style={{ bottom: 0, right: 24, width: minimized ? 280 : size.w, height: minimized ? 'auto' : size.h }}
    >
      {!minimized && (
        <>
          <div className="absolute top-0 left-4 right-0 h-1.5 cursor-n-resize z-10"
               onMouseDown={(e) => handleResizeMouseDown(e, 'n')} />
          <div className="absolute left-0 top-4 bottom-0 w-1.5 cursor-w-resize z-10"
               onMouseDown={(e) => handleResizeMouseDown(e, 'w')} />
          <div className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-20"
               onMouseDown={(e) => handleResizeMouseDown(e, 'nw')} />
        </>
      )}

      <div className="flex items-center justify-between px-3 h-10 bg-accent/60 rounded-t-lg border-b border-border shrink-0 select-none">
        <span className="text-sm font-medium text-foreground truncate">
          {subject || 'New Message'}
        </span>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          <button
            onClick={() => setMinimized((v) => !v)}
            className="p-1 rounded hover:bg-accent text-foreground/60 hover:text-foreground transition-colors"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? <ChevronUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDiscard}
            className="p-1 rounded hover:bg-destructive/20 text-foreground/60 hover:text-destructive transition-colors"
            title="Discard draft"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-accent text-foreground/60 hover:text-foreground transition-colors"
            title="Save draft & close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="shrink-0">
            <AddressField label="To"  chips={toChips}  onChipsChange={setToChips} />
            <AddressField label="Cc"  chips={ccChips}  onChipsChange={setCcChips} />
            <AddressField label="Bcc" chips={bccChips} onChipsChange={setBccChips} />

            <div className="flex items-center border-b border-border/60 px-3">
              <span className="text-xs text-foreground/40 w-14 shrink-0">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 py-1.5 bg-transparent outline-none text-sm text-foreground placeholder:text-foreground/30"
              />
            </div>
          </div>

          <div
            className="flex-1 flex flex-col relative min-h-0"
            onDragOver={(e)  => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }}
            onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false) }}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragOver(false)
              const files = Array.from(e.dataTransfer.files)
              if (files.length > 0) addFiles(files)
            }}
          >
            {isDragOver && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-primary/10 border-2 border-dashed border-primary/50 rounded pointer-events-none">
                <Paperclip className="w-8 h-8 text-primary/70" />
                <span className="text-sm font-medium text-primary/80">Drop files to attach</span>
                <span className="text-xs text-primary/60">Max 20 MB per file</span>
              </div>
            )}

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message… (or drag & drop files to attach)"
              className="flex-1 resize-none bg-transparent p-3 text-sm text-foreground placeholder:text-foreground/30 outline-none leading-relaxed min-h-0"
            />

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t border-border/40">
                {attachments.map((att) => (
                  <AttachmentChip
                    key={att.id}
                    att={att}
                    onRemove={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 px-3 py-2 border-t border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              {hasLoadingFiles && !isSending && (
                <span className="flex items-center gap-1.5 text-xs text-foreground/50 shrink-0">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Reading files…
                </span>
              )}
              {isSending && (
                <span className="flex items-center gap-1.5 text-xs text-foreground/50">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {sendStatusLabel}
                </span>
              )}
              {sendState === 'done' && (
                <span className="flex items-center gap-1.5 text-xs text-green-500">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {sendStatusLabel}
                </span>
              )}
              {sendState === 'error' && (
                <span className="flex items-center gap-1.5 text-xs text-destructive min-w-0">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate" title={sendError}>{sendError}</span>
                </span>
              )}
              {sendState === 'done' && sendResults.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs ml-2 shrink-0">
                  {sendResults.map((r, i) => (
                    <span
                      key={i}
                      title={r.error ?? undefined}
                      className={r.status === 'failed' ? 'text-destructive' : 'text-green-500'}
                    >
                      {r.address.split('@')[0]}: {r.status}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  if (files.length > 0) addFiles(files)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSendBlocked}
                className="p-1.5 rounded text-foreground/50 hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
                title="Attach files (max 20 MB each)"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                onClick={handleSend}
                disabled={isSendBlocked || hasLoadingFiles}
                title={hasLoadingFiles ? 'Waiting for files to finish loading…' : undefined}
                className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />
                }
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ComposeWindow
