export function nowTime(): string {
  const d = new Date()
  return (
    d.getHours().toString().padStart(2, '0') +
    ':' +
    d.getMinutes().toString().padStart(2, '0')
  )
}

export function formatBotText(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')
}

export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
