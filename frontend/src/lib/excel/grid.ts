import type { CSSProperties } from 'react'
import type { HyperFormula } from 'hyperformula'
import { applyStyle, hfFmt, hfGet } from './hyperformula'
import type { CellData, MergeInfo, RenderedCell, SheetData } from './types'

export function buildMergeMaps(merges: SheetData['merges']) {
  const covered = new Set<string>()
  const mergeMap: Record<string, MergeInfo> = {}

  merges.forEach(([sr, sc, er, ec]) => {
    mergeMap[`${sr},${sc}`] = { rowspan: er - sr + 1, colspan: ec - sc + 1 }
    for (let r = sr; r <= er; r++) {
      for (let c = sc; c <= ec; c++) {
        if (r !== sr || c !== sc) covered.add(`${r},${c}`)
      }
    }
  })

  return { covered, mergeMap }
}

export function computeCellInfo(
  cd: CellData | undefined,
  sheetName: string,
  absRow: number,
  absCol: number,
  hf: HyperFormula | null,
): Pick<RenderedCell, 'display' | 'rawVal' | 'type' | 'formula' | 'isNum' | 'isError'> {
  if (!cd) {
    return { display: '', rawVal: '', type: 's', formula: '', isNum: false, isError: false }
  }

  let display = ''
  let rawVal = cd.v !== undefined && cd.v !== null ? String(cd.v) : ''
  let isNum = cd.t === 'n'
  let isError = false

  if (cd.w !== undefined && cd.w !== '') {
    display = cd.w
  } else if (cd.f && hf) {
    const hfVal = hfGet(hf, sheetName, absRow, absCol)
    if (hfVal !== null && hfVal !== undefined) {
      display = hfFmt(hfVal, cd.nf)
      if (typeof hfVal === 'number') {
        rawVal = String(hfVal)
        isNum = true
      } else if (typeof hfVal === 'object' && hfVal !== null && 'type' in hfVal) {
        isError = true
      }
    }
  } else if (cd.v !== undefined && cd.v !== null) {
    display = String(cd.v)
  }

  return {
    display,
    rawVal,
    type: isNum ? 'n' : cd.t || 's',
    formula: cd.f || '',
    isNum,
    isError,
  }
}

export function buildSheetGrid(
  sheet: SheetData,
  hf: HyperFormula | null,
): { cells: RenderedCell[]; minR: number; minC: number; maxR: number; maxC: number } {
  const [minR, minC, maxR, maxC] = sheet.range
  const { covered, mergeMap } = buildMergeMaps(sheet.merges)
  const cells: RenderedCell[] = []

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (covered.has(`${r},${c}`)) continue

      const cd = sheet.cells[`${r},${c}`]
      const info = computeCellInfo(cd, sheet.name, r, c, hf)
      const mg = mergeMap[`${r},${c}`]

      cells.push({
        row: r - minR,
        col: c - minC,
        absRow: r,
        absCol: c,
        ...info,
        style: cd?.s,
        rowspan: mg && mg.rowspan > 1 ? mg.rowspan : undefined,
        colspan: mg && mg.colspan > 1 ? mg.colspan : undefined,
      })
    }
  }

  return { cells, minR, minC, maxR, maxC }
}

export function cellInlineStyle(cell: RenderedCell): CSSProperties {
  const base = cell.style ? applyStyle(cell.style) : {}
  if (cell.isNum && !base.textAlign) {
    return { ...base, textAlign: 'right' }
  }
  return base
}
