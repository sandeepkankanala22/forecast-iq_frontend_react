import { useCallback, useEffect, useMemo, useState } from 'react'
import type { HyperFormula } from 'hyperformula'
import { buildSheetGrid, cellInlineStyle } from '../../lib/excel/grid'
import { colLabel, initHF } from '../../lib/excel/hyperformula'
import type { RenderedCell, SelectedCellState } from '../../lib/excel/types'
import { useForecast } from '../../context/ForecastContext'

export default function ExcelPreviewPanel() {
  const {
    excelSheets,
    excelPendingTabs,
    excelFilename,
    excelPreviewMode,
    excelFullscreen,
    setExcelFullscreen,
  } = useForecast()

  const [activeIdx, setActiveIdx] = useState(0)
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  const [hf, setHf] = useState<HyperFormula | null>(null)
  const [selectedCell, setSelectedCell] = useState<SelectedCellState | null>(null)

  useEffect(() => {
    if (excelSheets.length) {
      setHf(initHF(excelSheets))
      setActiveIdx(0)
      setPendingTab(null)
    }
  }, [excelSheets])

  const activeSheet = excelSheets[activeIdx]
  const grid = useMemo(() => {
    if (!activeSheet || pendingTab) return null
    return buildSheetGrid(activeSheet, hf)
  }, [activeSheet, hf, pendingTab])

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

  const onCellClick = useCallback((cell: SelectedCellState) => setSelectedCell(cell), [])

  if (!excelSheets.length) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-lg border border-chryselys-border bg-chryselys-bg text-sm text-chryselys-text-2">
        Building workbook…
      </div>
    )
  }

  const cellRef = selectedCell ? colLabel(selectedCell.col) + (selectedCell.row + 1) : ''
  const formulaText = selectedCell?.formula || selectedCell?.display || ''

  return (
    <>
      {excelFullscreen && (
        <div
          className="fixed inset-0 z-[499] bg-black/40 backdrop-blur-sm"
          onClick={() => setExcelFullscreen(false)}
        />
      )}
      <div
        id="excelViewerPanel"
        className={`flex h-[520px] flex-col overflow-hidden rounded-lg border border-chryselys-border ${
          excelFullscreen ? 'xv-fullscreen' : ''
        }`}
      >
        <div className="flex h-9 shrink-0 items-center gap-2 bg-chryselys-primary px-3 text-white">
          <div className="font-bold">
            X<span className="text-chryselys-gold">|</span>
          </div>
          <div className="truncate text-sm">{excelFilename}</div>
          {excelPreviewMode && (
            <span className="rounded border border-blue-200 bg-blue-50 px-1.5 text-[10px] font-semibold text-chryselys-primary">
              PREVIEW
            </span>
          )}
          <button
            type="button"
            className="ml-auto rounded p-1 hover:bg-white/10"
            onClick={() => setExcelFullscreen(!excelFullscreen)}
            title="Fullscreen preview"
          >
            ⛶
          </button>
        </div>

        <div className="flex h-7 shrink-0 items-center border-b border-chryselys-border bg-white text-[11px]">
          <div className="w-[72px] shrink-0 border-r border-chryselys-border px-2 text-center">{cellRef}</div>
          <div className="w-8 shrink-0 border-r border-chryselys-border px-1 text-center italic text-chryselys-gold">ƒx</div>
          <div className="min-w-0 flex-1 truncate px-2">{formulaText}</div>
        </div>

        {pendingTab ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-chryselys-text-2">
            <div className="text-2xl">⚙</div>
            <div className="font-semibold">"{pendingTab}" sheet is generating…</div>
            <div className="text-xs">The AI agent is building this sheet — it will appear automatically when ready</div>
          </div>
        ) : (
          <div className="xv-grid-wrapper min-h-0 flex-1 overflow-auto">
            <table className="border-collapse text-[11px]">
              <thead className="sticky top-0 z-10 bg-chryselys-bg">
                <tr>
                  <th className="w-9 border border-chryselys-border" />
                  {grid &&
                    Array.from({ length: grid.maxC - grid.minC + 1 }, (_, i) => (
                      <th key={i} className="border border-chryselys-border px-2 py-1 font-normal">
                        {colLabel(grid.minC + i)}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {grid &&
                  Array.from(cellsByRow.entries()).map(([row, cells]) => (
                    <tr key={row}>
                      <th className="border border-chryselys-border bg-chryselys-bg px-1 py-0.5 font-normal">
                        {row + 1}
                      </th>
                      {cells.map((cell) => (
                        <td
                          key={`${cell.row}-${cell.col}`}
                          className={`border border-chryselys-border px-1 py-0.5 ${cell.isNum ? 'xv-num text-right' : ''} ${selectedCell?.row === cell.row && selectedCell?.col === cell.col ? 'xv-selected' : ''}`}
                          style={cellInlineStyle(cell)}
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
                          rowSpan={cell.rowspan}
                          colSpan={cell.colspan}
                        >
                          {cell.display}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex shrink-0 border-t border-chryselys-border bg-chryselys-bg">
          {excelSheets.map((sh, i) => (
            <button
              key={sh.name}
              type="button"
              onClick={() => {
                setActiveIdx(i)
                setPendingTab(null)
              }}
              className={`border-r border-chryselys-border px-3 py-1 text-[11px] ${
                activeIdx === i && !pendingTab ? 'bg-white font-semibold text-chryselys-primary' : 'text-chryselys-text-2'
              }`}
            >
              {sh.name}
            </button>
          ))}
          {excelPendingTabs.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setPendingTab(name)}
              className={`xv-tab-pending border-r border-chryselys-border px-3 py-1 text-[11px] text-chryselys-text-2 ${
                pendingTab === name ? 'bg-white font-semibold' : ''
              }`}
            >
              {name}
              <span className="xv-tab-dot" />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
