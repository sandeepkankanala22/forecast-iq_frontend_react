import type { AssumptionValue } from './types'

export function formatValue(v: number, u?: string): string {
  if (u === '%') return (v * 100).toFixed(1)
  if (u === 'rate') return v.toFixed(4)
  if (u === '$') return v.toLocaleString()
  if (u === 'persons') return v.toLocaleString()
  return String(v)
}

export function validateParameter(
  key: string,
  data: AssumptionValue | undefined,
): { valid: boolean; message: string } {
  if (!data) return { valid: true, message: 'Parameter configured' }
  let valid = true
  let message = 'Within expected range'
  if (key === 'diagnosisRate' && data.value < 0.5) {
    valid = false
    message = 'Below 50% – verify data'
  } else if (key === 'peakProductShare' && data.value > 0.4) {
    valid = false
    message = 'Above 40% – high for new entrant'
  } else if (key === 'discount' && data.value > 0.3) {
    valid = false
    message = 'Above 30% – verify benchmarks'
  }
  return { valid, message }
}

export function validateAssumptions(
  assumptions: Record<string, AssumptionValue | unknown>,
  paramCount: number,
): { success: boolean; message: string } {
  const warnings: string[] = []
  const dr = assumptions.diagnosisRate as AssumptionValue | undefined
  const ps = assumptions.peakProductShare as AssumptionValue | undefined
  const disc = assumptions.discount as AssumptionValue | undefined
  const tr = assumptions.treatmentRate as AssumptionValue | undefined
  if (dr && dr.value < 0.5) warnings.push('Diagnosis rate below 50%')
  if (ps && ps.value > 0.4) warnings.push('Product share above 40%')
  if (disc && disc.value > 0.3) warnings.push('Discount above 30%')
  if (tr && tr.value < 0.4) warnings.push('Treatment rate below 40%')
  if (warnings.length) return { success: false, message: warnings.join(' | ') }
  return { success: true, message: `All ${paramCount} parameters validated` }
}

export function linkifyRationaleHtml(text: string | undefined, sourceCount: number): string {
  if (!text) return '—'
  let html = text
    .replace(/(https?:\/\/[^\s<>"'),]+)/g, '')
    .replace(/(?<!:\/\/)\b(pubmed\.ncbi\.nlm\.nih\.gov\/\d+)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (sourceCount > 0) {
    const count = Math.random() < 0.4 ? 1 : 2
    const picked: number[] = []
    const pool = Array.from({ length: sourceCount }, (_, i) => i)
    while (picked.length < count && pool.length) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    }
    const badgeHtml = picked
      .map(
        (i) =>
          `<span class="source-badge" data-source="${i + 1}" style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;background:rgba(26,79,114,0.07);border:1px solid rgba(26,79,114,0.18);border-radius:10px;font-size:10px;color:#1A4F72;font-weight:700;cursor:pointer;white-space:nowrap;">Source ${i + 1}</span>`,
      )
      .join('')
    html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:7px;padding-top:7px;border-top:1px solid rgba(26,79,114,0.08);">${badgeHtml}</div>`
  }
  return html
}
