export function AddressChip({ addr, myEmail }) {
  if (!addr) return null
  const isMe = myEmail && addr.email === myEmail
  const label =
    addr.name && addr.name !== addr.email.split('@')[0] && addr.name !== addr.email
      ? addr.name
      : addr.email
  return (
    <span
      title={addr.email}
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm border max-w-[280px] truncate ${
        isMe
          ? 'bg-primary/10 border-primary/30 text-primary font-medium'
          : 'bg-white/5 border-white/10 text-foreground/80'
      }`}
    >
      {label}
    </span>
  )
}
