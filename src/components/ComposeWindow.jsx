import { useState, useRef, useCallback } from 'react'
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
import { AddressField } from '@/components/compose/AddressField'
import { AttachmentChip } from '@/components/compose/AttachmentChip'
import { useSendEmail } from '@/hooks/useSendEmail'
import { useAttachments } from '@/hooks/useAttachments'
import { useResizable } from '@/hooks/useResizable'

const ComposeWindow = ({ myEmail, onClose, onSent, replyData = null, draftId = null, onDeleteDraft }) => {
  const [minimized, setMinimized] = useState(false)

  const currentDraftId = useRef(draftId ?? ('draft_' + Date.now()))

  const [toChips,  setToChips]  = useState(() => replyData?.to  ?? [])
  const [ccChips,  setCcChips]  = useState(() => replyData?.cc  ?? [])
  const [bccChips, setBccChips] = useState(() => replyData?.bcc ?? [])
  const [subject,  setSubject]  = useState(() => replyData?.subject ?? '')
  const [body,     setBody]     = useState(() => replyData?.body ?? '')

  const { sendState, sendError, sendResults, handleSend, reportError } = useSendEmail({
    myEmail, replyData, draftId, onDeleteDraft, onSent, onClose,
  })

  const { attachments, isDragOver, setIsDragOver, fileInputRef, addFiles, removeAttachment } = useAttachments({
    onError: reportError,
  })

  const { windowRef, size, handleResizeMouseDown } = useResizable()

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

      {/* Title bar */}
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
          {/* Address + subject fields */}
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

          {/* Body + drag-and-drop */}
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
                  <AttachmentChip key={att.id} att={att} onRemove={() => removeAttachment(att.id)} />
                ))}
              </div>
            )}
          </div>

          {/* Footer: status + send */}
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
                onClick={() => handleSend({ toChips, ccChips, bccChips, subject, body, attachments })}
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
