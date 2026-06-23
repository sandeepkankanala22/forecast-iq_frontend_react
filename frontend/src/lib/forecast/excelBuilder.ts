import type { SheetData } from '../excel/types'
import type { Assumptions, ResearchSource, SelectedParameters } from './types'
import { PARAMETER_LABELS } from './constants'

export function buildInputSheet(
  assumptions: Assumptions,
  selectedParameters: SelectedParameters,
  researchSources: ResearchSource[],
): SheetData {
  const COLS = ['Parameter', 'Base Value', 'YoY Growth (%)', 'Range (min–max)', 'Rationale / Notes']
  const paramLabels = { ...PARAMETER_LABELS }

  const rows: (string | number)[][] = []
  rows.push(['Inputs', '', '', '', ''])
  rows.push(['', '', '', '', ''])
  rows.push(['GENERAL PARAMETERS', '', '', '', ''])
  rows.push(['Field', 'Value', '', '', ''])
  ;[
    ['Country', assumptions.country || ''],
    ['Product Name', assumptions.productName || ''],
    ['Class / MOA', assumptions.classMoa || ''],
    ['Indication', assumptions.indication || ''],
    ['Launch Year', assumptions.launchYear || ''],
    ['Peak Year', assumptions.peakYear || ''],
  ].forEach((r) => rows.push([r[0], String(r[1]), '', '', '']))
  rows.push(['', '', '', '', ''])
  rows.push(['FORECAST ASSUMPTIONS', '', '', '', ''])
  rows.push(COLS)

  const srcPoolSize = researchSources.length > 0 ? researchSources.length : 8
  function rationaleForCell(text?: string) {
    const clean = (text || '')
      .replace(/https?:\/\/[^\s,)]+/g, '')
      .replace(/pubmed\.ncbi\.nlm\.nih\.gov\/\d+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    const count = Math.random() < 0.4 ? 1 : 2
    const picked: number[] = []
    const pool = Array.from({ length: srcPoolSize }, (_, i) => i + 1)
    while (picked.length < count && pool.length) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    }
    picked.sort((a, b) => a - b)
    return clean + (clean ? '  ' : '') + picked.map((n) => `Source ${n}`).join(', ')
  }

  const flow = selectedParameters.parameters
  flow.forEach((k) => {
    const a = assumptions[k] as { value?: number; unit?: string; unitType?: string; yoyGrowth?: number; range?: string; rationale?: string } | undefined
    if (!a || a.value === undefined) return
    let baseVal: string | number = a.value
    if (a.unit === '$') baseVal = Number(a.value).toLocaleString()
    else if (a.unit === '%' || a.unitType === 'rate')
      baseVal = (parseFloat(String(a.value)) * 100).toFixed(1) + '%'
    else if (a.unit === 'persons') baseVal = Number(a.value).toLocaleString()
    const yoy = a.yoyGrowth !== undefined ? (parseFloat(String(a.yoyGrowth)) * 100).toFixed(1) + '%' : '—'
    rows.push([paramLabels[k] || k, String(baseVal), yoy, a.range || '—', rationaleForCell(a.rationale)])
  })

  const cells: SheetData['cells'] = {}
  const TITLE_ROW = 0
  const GPARAM_ROW = 2
  const FASSUM_ROW = rows.findIndex((r) => r[0] === 'FORECAST ASSUMPTIONS')
  const COLHD_ROW = FASSUM_ROW + 1
  const GPFIELD_ROW = 3
  rows.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val === '' || val === undefined || val === null) return
      const key = `${r},${c}`
      cells[key] = {
        v: val,
        t: typeof val === 'number' ? 'n' : 's',
        s:
          r === TITLE_ROW
            ? { bold: true, bg: '#1A4F72', color: '#fff', fontSize: 13 }
            : r === GPARAM_ROW
              ? { bold: true, bg: '#1A4F72', color: '#fff', fontSize: 10 }
              : r === FASSUM_ROW
                ? { bold: true, bg: '#1A4F72', color: '#fff', fontSize: 10 }
                : r === GPFIELD_ROW
                  ? { bold: true, bg: '#dce8f2', color: '#1A4F72' }
                  : r === COLHD_ROW
                    ? { bold: true, bg: '#dce8f2', color: '#1A4F72' }
                    : c === 4
                      ? { color: '#64748b', fontSize: 9, wrap: true }
                      : {},
      }
    })
  })

  return {
    name: 'Inputs',
    range: [0, 0, rows.length - 1, 4],
    cells,
    merges: [
      [TITLE_ROW, 0, TITLE_ROW, 4],
      [GPARAM_ROW, 0, GPARAM_ROW, 4],
      [FASSUM_ROW, 0, FASSUM_ROW, 4],
    ],
    colWidths: { 0: 175, 1: 105, 2: 95, 3: 130, 4: 300 },
    rowHeights: {},
  }
}
