export function escHtml(s: unknown): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function syntaxHighlight(json: string): string {
  const escaped = escHtml(json)
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (m) => {
      let cls = 'text-[#E8B84B]'
      if (/^"/.test(m)) {
        cls = /:$/.test(m) ? 'text-[#A8C4D4]' : 'text-[#86efac]'
      } else if (/true|false/.test(m)) {
        cls = 'text-[#f9a8d4]'
      } else if (/null/.test(m)) {
        cls = 'text-[#4A6580]'
      }
      return `<span class="${cls}">${m}</span>`
    },
  )
}

export function formatAssumptionValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return '—'
  const k = (key || '').toLowerCase()
  if (typeof val === 'number') {
    if (
      k.includes('rate') ||
      k.includes('share') ||
      k.includes('percentage') ||
      k.includes('discount') ||
      k.includes('compliance')
    ) {
      return (val * 100).toFixed(1) + '%'
    }
    if (k.includes('price') || k.includes('cost')) return '$' + val.toLocaleString()
    if (k.includes('population') && val > 10000) return val.toLocaleString()
    if (k.includes('period') || k.includes('year')) return val + ' yrs'
    return val.toLocaleString()
  }
  return String(val)
}

export function extractVariables(text: string): string[] {
  const found = [...text.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)].map((m) => m[1])
  return [...new Set(found)]
}

export function toDataUri(content: string, mime: string): string {
  const b64 = btoa(unescape(encodeURIComponent(content)))
  return `data:${mime};base64,${b64}`
}
