import { useState, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { isValidEmail } from '@/lib/utils'

function Chip({ addr, onRemove }) {
  const valid = isValidEmail(addr)
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm max-w-[220px] truncate border ${
        valid
          ? 'bg-primary/10 border-primary/25 text-foreground/90'
          : 'bg-destructive/10 border-destructive/30 text-destructive'
      }`}
      title={addr}
    >
      <span className="truncate">{addr}</span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

export function AddressField({ label, chips, onChipsChange }) {
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef(null)

  const commit = useCallback(
    (raw) => {
      const val = raw.trim().replace(/,+$/, '').trim()
      if (!val) return
      onChipsChange([...chips, val])
      setInputVal('')
    },
    [chips, onChipsChange],
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(inputVal)
    } else if (e.key === 'Tab' && inputVal.trim()) {
      e.preventDefault()
      commit(inputVal)
    } else if (e.key === 'Backspace' && inputVal === '' && chips.length > 0) {
      onChipsChange(chips.slice(0, -1))
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    const parts = pasted.split(/[,;\s\n]+/).filter(Boolean)
    if (parts.length > 1) {
      onChipsChange([...chips, ...parts])
    } else {
      setInputVal((prev) => prev + pasted)
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1 px-3 py-1.5 min-h-[34px] border-b border-border/60 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <span className="text-xs text-foreground/40 w-7 shrink-0">{label}</span>
      {chips.map((addr, i) => (
        <Chip
          key={i}
          addr={addr}
          onRemove={() => onChipsChange(chips.filter((_, j) => j !== i))}
        />
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(inputVal)}
        onPaste={handlePaste}
        className="flex-1 min-w-[80px] bg-transparent outline-none text-sm text-foreground placeholder:text-foreground/30"
        placeholder={chips.length === 0 ? 'Email address…' : ''}
      />
    </div>
  )
}
