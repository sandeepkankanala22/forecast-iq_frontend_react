import {
  CHAT_STEPS,
  COUNTRIES,
  COUNTRY_ALIASES,
  INDICATIONS,
} from './constants'
import type { ProductInfo } from './types'

export function looksNonsensical(text: string): boolean {
  const t = text.trim()
  if (/^20[2-4]\d$/.test(t)) return false
  if (/^[^a-zA-Z]{1,4}$/.test(t)) return true
  if (/^[^aeiou\s]{6,}$/i.test(t)) return true
  return false
}

export function resolveCountry(text: string): string | null {
  const lower = text.toLowerCase().trim()
  if (COUNTRY_ALIASES[lower]) return COUNTRY_ALIASES[lower]
  return COUNTRIES.find((c) => lower.includes(c.toLowerCase())) || null
}

export function extractFieldsLocal(
  text: string,
  chatStep: number,
  currentForm: ProductInfo,
): Partial<ProductInfo> {
  const lower = text.toLowerCase()
  const updates: Partial<ProductInfo> = {}

  const country = resolveCountry(text)
  if (country) updates.country = country
  else {
    for (const [alias, canon] of Object.entries(COUNTRY_ALIASES)) {
      if (lower.includes(alias)) {
        updates.country = canon
        break
      }
    }
  }

  const years = [...text.matchAll(/\b(20[2-4]\d)\b/g)].map((m) => parseInt(m[1]))
  if (years.length === 1) {
    if (/launch|start|begin|introduc/i.test(text)) updates.launchYear = String(years[0])
    else if (/peak|max|highest/i.test(text)) updates.peakYear = String(years[0])
    else {
      const currentStep = chatStep < CHAT_STEPS.length ? CHAT_STEPS[chatStep] : null
      if (currentStep?.key === 'peakYear') updates.peakYear = String(years[0])
      else if (currentStep?.key === 'launchYear') updates.launchYear = String(years[0])
      else if (!currentForm.launchYear) updates.launchYear = String(years[0])
      else if (!currentForm.peakYear) updates.peakYear = String(years[0])
    }
  } else if (years.length >= 2) {
    updates.launchYear = String(Math.min(...years))
    updates.peakYear = String(Math.max(...years))
  }

  const KNOWN_WORDS = new Set([
    ...COUNTRIES.map((c) => c.toLowerCase()),
    ...Object.keys(COUNTRY_ALIASES),
    'forecast', 'for', 'the', 'a', 'an', 'in', 'on', 'at', 'with', 'and', 'or', 'of', 'to', 'is',
    'launching', 'launch', 'peak', 'sales', 'year', 'target', 'indication', 'country',
    'product', 'drug', 'compound', 'called', 'named', 'inhibitor', 'antibody', 'therapy',
    'treatment', 'cancer', 'disease', 'diabetes', 'oncology', 'sclerosis', 'arthritis',
    'failure', 'alzheimer', 'nsclc', 'sclc', 'crc', 'hcc', 'tnbc', 'aml', 'cll', 'dlbcl',
    't2d', 'ra', 'ms', 'hf',
  ])

  const nameMatch =
    text.match(
      /(?:(?:product|drug|compound|called|named?|for)\s+)([A-Z][A-Za-z0-9][A-Za-z0-9\-.]{1,28})(?:\s|,|\(|$)/m,
    ) ||
    text.match(/"([^"]{2,40})"/) ||
    text.match(/'([^']{2,40})'/)

  if (nameMatch?.[1]) {
    const candidate = nameMatch[1].trim()
    if (!KNOWN_WORDS.has(candidate.toLowerCase()) && /[A-Z]/.test(candidate[0])) {
      updates.productName = candidate
    }
  }

  if (!updates.productName) {
    const tokens = text.match(/\b([A-Z][a-zA-Z0-9-]{3,30})\b/g) || []
    for (const tok of tokens) {
      if (!KNOWN_WORDS.has(tok.toLowerCase()) && !/^20\d\d$/.test(tok)) {
        const alreadyCaptured = [updates.country, updates.indication, updates.classMoa].some(
          (v) => v && v.toLowerCase().includes(tok.toLowerCase()),
        )
        if (!alreadyCaptured) {
          updates.productName = tok
          break
        }
      }
    }
  }

  const moaPatterns = [
    'Monoclonal Antibody', 'mAb', 'PD-1 Inhibitor', 'PD-L1 Inhibitor', 'PD1', 'PDL1',
    'SGLT2 Inhibitor', 'SGLT2', 'BTK Inhibitor', 'BTK', 'JAK Inhibitor', 'JAK',
    'PCSK9 Inhibitor', 'PCSK9', 'GLP-1', 'CAR-T', 'CAR T',
  ]
  for (const pat of moaPatterns) {
    if (lower.includes(pat.toLowerCase())) {
      updates.classMoa = pat.replace(/\b\w/g, (c) => c.toUpperCase())
      break
    }
  }

  const indicationMap = [
    ['rheumatoid arthritis', 'ra ', '\\bra\\b'],
    ['multiple sclerosis', 'ms ', '\\bms\\b'],
    ['type 2 diabetes', 't2d', 'diabetes'],
    ['oncology', 'cancer', 'nsclc', 'sclc', 'crc', 'hcc', 'tnbc', 'aml', 'cll', 'dlbcl'],
    ['alzheimer', 'dementia'],
    ['heart failure', 'hf ', '\\bhf\\b', 'hfref', 'hfpef'],
  ]
  const indicationCanon = [
    'Rheumatoid Arthritis', 'Multiple Sclerosis', 'Type 2 Diabetes',
    'Oncology', 'Alzheimer Disease', 'Heart Failure',
  ]
  for (let i = 0; i < indicationMap.length; i++) {
    if (indicationMap[i].some((k) => new RegExp(k, 'i').test(text))) {
      updates.indication = indicationCanon[i]
      break
    }
  }

  return updates
}

export function isQuestion(text: string): boolean {
  return (
    text.includes('?') ||
    /^\s*(what|how|which|why|when|where|who|can|could|should|would|is|are|does|do|tell|explain|help|please|i want to know|what's|whats)/i.test(
      text,
    )
  )
}

export function looksLikeCommand(text: string): boolean {
  return !isQuestion(text) && text.trim().split(/\s+/).length <= 9
}

export function allProductFieldsFilled(form: ProductInfo): boolean {
  return Object.values(form).every((v) => v && String(v).trim() !== '')
}

export function confirmMessage(form: ProductInfo): string {
  return `✓ **All product details captured!** Please review and confirm:\n\n• **Country:** ${form.country}\n• **Product:** ${form.productName}\n• **Class/MoA:** ${form.classMoa}\n• **Indication:** ${form.indication}\n• **Launch Year:** ${form.launchYear} → **Forecast - End Year:** ${form.peakYear}\n\nDoes everything look correct? Click **Confirm & Proceed** to move to the next step.`
}

export const CHAT_HINTS: Record<string, string> = {
  country: 'You can target one of these markets: ' + COUNTRIES.join(', '),
  productName: 'Please tell me the drug/compound name (e.g. **TUB-040**, **ABC-101**, **NovaMab**).',
  classMoa:
    'Common classes include:\n• **Monoclonal Antibody**\n• **SGLT2 Inhibitor**\n• **PD-1 Inhibitor**\n• **JAK Inhibitor**\n• **BTK Inhibitor**',
  indication: 'Common indications include:\n' + INDICATIONS.map((i) => `• **${i}**`).join('\n'),
  launchYear: 'The planned launch year (e.g. **2026**, **2027**). Must be 2024–2040.',
  peakYear: 'The Forecast - End Year — must be after the launch year.',
}

export const CHAT_HINT_QR: Record<string, string[]> = {
  country: COUNTRIES,
  productName: [],
  classMoa: ['Monoclonal Antibody', 'SGLT2 Inhibitor', 'PD-1 Inhibitor', 'JAK Inhibitor'],
  indication: INDICATIONS,
  launchYear: ['2025', '2026', '2027', '2028', '2030'],
  peakYear: ['2030', '2031', '2032', '2033', '2035'],
}
