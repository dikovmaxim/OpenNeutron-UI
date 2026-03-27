import { ExternalLink } from 'lucide-react'
import { segmentLinks, stripHtml } from '@/emailParser'

const ATTR_RE = /^On .{3,300} wrote:\s*$/

function parseBlocks(text) {
  const lines = text.split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('>')) {
      const start = i
      while (i < lines.length && lines[i].startsWith('>')) i++
      blocks.push({ type: 'quote', lines: lines.slice(start, i) })
    } else if (ATTR_RE.test(line.trim()) && i + 1 < lines.length && lines[i + 1].startsWith('>')) {
      blocks.push({ type: 'attribution', content: line })
      i++
    } else {
      const start = i
      while (
        i < lines.length &&
        !lines[i].startsWith('>') &&
        !(ATTR_RE.test(lines[i].trim()) && i + 1 < lines.length && lines[i + 1].startsWith('>'))
      ) i++
      const content = lines.slice(start, i).join('\n')
      if (content.trim()) blocks.push({ type: 'text', content })
    }
  }
  return blocks
}

function stripQuotePrefix(line) {
  return line.replace(/^>+\s?/, '')
}

function TextWithLinks({ text }) {
  return segmentLinks(text).map((seg, i) =>
    seg.type === 'link' ? (
      <a
        key={i}
        href={seg.value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline decoration-primary/40 hover:decoration-primary inline-flex items-baseline gap-0.5 break-all"
      >
        {seg.value}
        <ExternalLink className="size-3 inline shrink-0 opacity-60 ml-0.5 self-center" />
      </a>
    ) : (
      <span key={i}>{seg.value}</span>
    ),
  )
}

export function EmailBody({ textBody, htmlBody }) {
  const text = textBody || (htmlBody ? stripHtml(htmlBody) : '')
  const blocks = parseBlocks(text)

  return (
    <div className="font-sans text-foreground/90 space-y-1">
      {blocks.map((block, i) => {
        if (block.type === 'attribution') {
          return (
            <p key={i} className="text-xs text-foreground/40 italic pt-4 pb-0.5 select-none">
              {block.content}
            </p>
          )
        }
        if (block.type === 'quote') {
          return (
            <blockquote
              key={i}
              className="border-l-2 border-foreground/20 pl-3 space-y-px"
            >
              {block.lines.map((line, j) => {
                const stripped = stripQuotePrefix(line)
                return (
                  <p key={j} className="text-sm text-foreground/40 whitespace-pre-wrap break-words">
                    {stripped.trim() ? <TextWithLinks text={stripped} /> : '\u00a0'}
                  </p>
                )
              })}
            </blockquote>
          )
        }
        return (
          <pre key={i} className="whitespace-pre-wrap break-words font-sans text-sm/relaxed">
            <TextWithLinks text={block.content} />
          </pre>
        )
      })}
    </div>
  )
}
