import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { HyperFormula } from 'hyperformula'
import { buildSheetGrid, cellInlineStyle } from '../lib/excel/grid'
import { colLabel, initHF } from '../lib/excel/hyperformula'
import type { ExcelData, RenderedCell, SelectedCellState, SheetData } from '../lib/excel/types'

function formatApiError(detail: unknown, fallback = 'Could not load file.'): string {
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === 'object' && item && 'msg' in item
          ? String((item as { msg: string }).msg)
          : String(item),
      )
      .join('; ')
  }
  return fallback
}

function statusStats(cell: SelectedCellState | null) {
  if (!cell) return { avg: '—', count: '—', sum: '—' }
  const num = parseFloat(cell.rawVal)
  if (!isNaN(num) && cell.type === 'n') {
    return {
      avg: num.toLocaleString(),
      count: '1',
      sum: num.toLocaleString(),
    }
  }
  return {
    avg: '—',
    count: cell.display ? '1' : '0',
    sum: '—',
  }
}

export default function ExcelViewerPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ExcelData | null>(null)
  const [hf, setHf] = useState<HyperFormula | null>(null)
  const [activeSheetIdx, setActiveSheetIdx] = useState(0)
  const [selectedCell, setSelectedCell] = useState<SelectedCellState | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      setError('No workbook session. Open this page from the forecast app after generating an Excel file.')
      return
    }

    const url = `/api/excel/data?session_id=${encodeURIComponent(sessionId)}`

    setLoading(true)
    setError(null)

    fetch(url)
      .then(async (r) => {
        const json = (await r.json()) as ExcelData & { detail?: unknown; error?: string }
        if (!r.ok) throw new Error(formatApiError(json.detail, json.error || 'Could not load file.'))
        if (json.error) throw new Error(json.error)
        return json
      })
      .then((json) => {
        setData(json)
        setHf(initHF(json.sheets))
        setActiveSheetIdx(0)
        setSelectedCell(null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  const sheets = data?.sheets ?? []
  const activeSheet: SheetData | undefined = sheets[activeSheetIdx]

  const grid = useMemo(() => {
    if (!activeSheet) return null
    return buildSheetGrid(activeSheet, hf)
  }, [activeSheet, hf])

  const cellsByRow = useMemo(() => {
    if (!grid) return new Map<number, RenderedCell[]>()
    const map = new Map<number, RenderedCell[]>()
    grid.cells.forEach((cell) => {
      const row = map.get(cell.row) ?? []
      row.push(cell)
      map.set(cell.row, row)
    })
    map.forEach((row) => row.sort((a, b) => a.col - b.col))
    return map
  }, [grid])

  const onCellClick = useCallback((cell: SelectedCellState) => {
    setSelectedCell(cell)
  }, [])

  const onSheetChange = useCallback((idx: number) => {
    setActiveSheetIdx(idx)
    setSelectedCell(null)
  }, [])

  const stats = statusStats(selectedCell)
  const cellRef = selectedCell ? colLabel(selectedCell.col) + (selectedCell.row + 1) : ''
  const formulaText = selectedCell?.formula || selectedCell?.display || ''
  const isFormula = Boolean(selectedCell?.formula)

  const rowCount = grid ? grid.maxR - grid.minR + 1 : 0
  const colCount = grid ? grid.maxC - grid.minC + 1 : 0

  return (
    <div className="fixed inset-0 z-50 flex h-screen flex-col overflow-hidden bg-white font-[Calibri,'Segoe_UI',Arial,sans-serif] text-[11px] text-[#212121]">
      {/* Title bar */}
      <div className="flex h-11 shrink-0 items-center gap-2 bg-[#1A4F72] px-3.5">
        <div className="shrink-0 font-['Segoe_UI',Arial,sans-serif] text-lg font-bold tracking-tight text-white">
          Chryselys
        </div>
        <div className="truncate font-['Segoe_UI',Arial,sans-serif] text-[13px] font-normal text-white/90">
          {data?.filename ?? ''}
        </div>
        {!loading && !error && data && (
          <div className="ml-auto flex gap-5 font-['Segoe_UI',Arial,sans-serif] text-[11px] text-[#A8C4D4]">
            <div>
              Rows: <strong className="text-white">{rowCount}</strong>
            </div>
            <div>
              Cols: <strong className="text-white">{colCount}</strong>
            </div>
            <div>
              Sheets: <strong className="text-white">{sheets.length}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Formula bar */}
      <div className="flex h-7 shrink-0 items-center border-b border-[#d0d0d0] bg-white">
        <div className="flex h-full w-[72px] shrink-0 items-center justify-center border-r border-[#d0d0d0] px-1.5 font-[Calibri,'Segoe_UI',Arial,sans-serif] text-[11px] text-[#212121]">
          {cellRef}
        </div>
        <div className="flex h-full shrink-0 items-center border-r border-[#d0d0d0] px-2 text-[12px] italic text-[#C9922A]">
          ƒx
        </div>
        <div
          className={`min-w-0 flex-1 truncate px-2 font-[Calibri,'Segoe_UI',Arial,sans-serif] text-[11px] ${
            isFormula ? 'text-[#0000cc]' : 'text-[#212121]'
          }`}
        >
          {formulaText}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 font-['Segoe_UI',Arial,sans-serif] text-[13px] text-[#888888]">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#e0e0e0] border-t-[#C9922A]" />
          <div>Opening spreadsheet…</div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 font-['Segoe_UI',Arial,sans-serif] text-[13px] text-[#c00000]">
          <div className="text-[32px]">⚠</div>
          <div>{error}</div>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && grid && activeSheet && (
        <div className="grid-wrapper flex-1 overflow-auto bg-white [scrollbar-color:#c0c0c0_#f5f5f5] [scrollbar-width:thin]">
          <table className="border-collapse font-[Calibri,'Segoe_UI',Arial,sans-serif] text-[11px]">
            <colgroup>
              <col style={{ width: 40 }} />
              {Array.from({ length: grid.maxC - grid.minC + 1 }, (_, i) => {
                const absCol = grid.minC + i
                const w = activeSheet.colWidths[String(absCol)] || 80
                return <col key={absCol} style={{ width: w }} />
              })}
            </colgroup>
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 min-w-10 w-10 border-b border-r border-[#bfbfbf] bg-[#f2f2f2] px-0 py-[3px] text-center font-normal text-[#555555] select-none" />
                {Array.from({ length: grid.maxC - grid.minC + 1 }, (_, i) => (
                  <th
                    key={i}
                    className={`sticky top-0 z-10 min-w-16 border-b border-r border-[#d0d0d0] bg-[#f2f2f2] px-0 py-[3px] text-center font-normal text-[#555555] select-none ${
                      selectedCell?.col === i
                        ? 'border-b-[#C9922A] bg-[rgba(201,146,42,0.12)] text-[#C9922A]'
                        : 'border-b-[#bfbfbf]'
                    }`}
                  >
                    {colLabel(i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: grid.maxR - grid.minR + 1 }, (_, rowIdx) => {
                const absRow = grid.minR + rowIdx
                const rh = activeSheet.rowHeights[String(absRow)]
                const rowCells = cellsByRow.get(rowIdx) ?? []
                return (
                  <tr key={rowIdx} style={rh ? { height: rh } : undefined}>
                    <th
                      className={`sticky left-0 z-[5] min-w-10 w-10 border-b border-r border-[#bfbfbf] bg-[#f2f2f2] px-1.5 text-right font-normal text-[#555555] select-none ${
                        selectedCell?.row === rowIdx
                          ? 'bg-[rgba(201,146,42,0.12)] text-[#C9922A]'
                          : ''
                      }`}
                    >
                      {absRow + 1}
                    </th>
                    {rowCells.map((cell) => {
                      const isSelected =
                        selectedCell?.row === cell.row && selectedCell?.col === cell.col
                      return (
                        <td
                          key={`${cell.row},${cell.col}`}
                          rowSpan={cell.rowspan}
                          colSpan={cell.colspan}
                          onClick={() =>
                            onCellClick({
                              row: cell.row,
                              col: cell.col,
                              display: cell.display,
                              formula: cell.formula,
                              rawVal: cell.rawVal,
                              type: cell.type,
                            })
                          }
                          className={`h-5 max-w-[200px] min-w-16 truncate border-b border-r border-[#d0d0d0] bg-white px-1.5 py-0.5 align-middle whitespace-nowrap ${
                            cell.isError ? 'text-[#c00000]' : ''
                          } ${isSelected ? 'outline outline-2 outline-[#C9922A] -outline-offset-1' : ''}`}
                          style={cellInlineStyle(cell)}
                        >
                          {cell.display}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sheet tabs */}
      <div className="flex h-[26px] shrink-0 items-stretch border-t border-[#d0d0d0] bg-[#f2f2f2]">
        <div className="tabs-bar flex flex-1 items-end overflow-x-auto [scrollbar-width:none]">
          {sheets.map((sh, i) => (
            <button
              key={sh.name}
              type="button"
              onClick={() => onSheetChange(i)}
              className={`mb-0 mr-0.5 cursor-pointer self-end border border-transparent px-3.5 pb-1 pt-[5px] font-[Calibri,'Segoe_UI',Arial,sans-serif] text-[11px] whitespace-nowrap ${
                i === activeSheetIdx
                  ? 'border-[#d0d0d0] border-b-white bg-white font-semibold text-[#1A4F72]'
                  : 'bg-[#d9d9d9] text-[#555555] hover:bg-[#ebebeb] hover:text-[#212121]'
              }`}
            >
              {sh.name}
            </button>
          ))}
        </div>
      </div>

      {/* Status bar */}
      {!loading && !error && data && (
        <div className="flex h-[22px] shrink-0 items-center justify-end gap-5 bg-[#1A4F72] px-3.5 font-['Segoe_UI',Arial,sans-serif] text-[11px] text-[#A8C4D4]">
          <div>
            Average: <strong className="text-white">{stats.avg}</strong>
          </div>
          <div>
            Count: <strong className="text-white">{stats.count}</strong>
          </div>
          <div>
            Sum: <strong className="text-white">{stats.sum}</strong>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between border-t border-[#E0E6ED] bg-[#F5F6F8] px-3.5 py-2 font-['Segoe_UI',sans-serif] text-[11px] text-[#4A6580]">
        <span>Copyright © 2026 Chryselys All rights reserved.</span>
        <span>www.chryselys.com | info@chryselys.com</span>
      </div>
    </div>
  )
}
