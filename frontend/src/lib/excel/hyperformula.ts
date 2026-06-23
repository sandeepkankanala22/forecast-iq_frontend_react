import { HyperFormula, type CellValue } from 'hyperformula'
import type { CSSProperties } from 'react'
import type { CellStyle, SheetData } from './types'

export function initHF(sheets: SheetData[]): HyperFormula | null {
  try {
    const sheetsData: Record<string, (string | number | boolean | null)[][]> = {}
    sheets.forEach((sh) => {
      const [, , maxR, maxC] = sh.range
      const rows = maxR + 1
      const cols = maxC + 1
      const grid: (string | number | boolean | null)[][] = Array.from({ length: rows }, () =>
        Array(cols).fill(null),
      )
      Object.entries(sh.cells).forEach(([key, cd]) => {
        const [r, c] = key.split(',').map(Number)
        if (r >= rows || c >= cols) return
        if (cd.f) {
          grid[r][c] = cd.f
        } else if (cd.v !== undefined && cd.v !== null) {
          grid[r][c] = cd.t === 'n' ? Number(cd.v) : cd.v
        }
      })
      sheetsData[sh.name] = grid
    })
    const hf = HyperFormula.buildFromSheets(sheetsData, { licenseKey: 'gpl-v3' })
    console.log('HyperFormula ready:', Object.keys(sheetsData).length, 'sheet(s)')
    return hf
  } catch (e) {
    console.warn('HyperFormula init failed:', e)
    return null
  }
}

export function hfGet(hf: HyperFormula | null, sheetName: string, r: number, c: number): CellValue | null {
  if (!hf) return null
  try {
    const id = hf.getSheetId(sheetName)
    if (id === undefined) return null
    return hf.getCellValue({ sheet: id, row: r, col: c })
  } catch {
    return null
  }
}

export function hfFmt(val: CellValue | null | undefined, nf?: string): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object' && val !== null && 'type' in val) return String(val)
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'number') {
    if (!nf || nf === 'General' || nf === '@') {
      if (Number.isFinite(val) && val === Math.trunc(val) && Math.abs(val) < 1e15) {
        return String(Math.trunc(val))
      }
      return String(val)
    }
    try {
      if (nf.includes('%')) {
        const m = nf.match(/\.(0+)/)
        return (val * 100).toFixed(m ? m[1].length : 0) + '%'
      }
      const symM = nf.match(/[$£€]/)
      if (symM) {
        const m = nf.match(/\.(0+)/)
        const dec = m ? m[1].length : 2
        return (
          symM[0] +
          val.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
        )
      }
      if (nf.includes(',')) {
        const m = nf.match(/\.(0+)/)
        const dec = m ? m[1].length : 0
        return val.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
      }
      const m = nf.match(/\.(0+)/)
      if (m) return val.toFixed(m[1].length)
    } catch {
      // fall through
    }
    return String(val)
  }
  return String(val)
}

export function colLabel(n: number): string {
  let s = ''
  n++
  while (n > 0) {
    s = String.fromCharCode(64 + (n % 26 || 26)) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function applyStyle(s: CellStyle): CSSProperties {
  const style: CSSProperties = {}
  if (s.bg) style.backgroundColor = s.bg
  if (s.bold) style.fontWeight = 'bold'
  if (s.italic) style.fontStyle = 'italic'
  if (s.underline) style.textDecoration = 'underline'
  if (s.fontSize) style.fontSize = Math.round(s.fontSize * 4 / 3) + 'px'
  if (s.fontName) style.fontFamily = `"${s.fontName}", Calibri, sans-serif`
  if (s.color) style.color = s.color
  if (s.align && s.align !== 'general') style.textAlign = s.align as CSSProperties['textAlign']
  if (s.wrap) style.whiteSpace = 'normal'
  return style
}
