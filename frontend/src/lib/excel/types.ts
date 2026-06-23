export interface CellStyle {
  bg?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fontSize?: number
  fontName?: string
  color?: string
  align?: string
  wrap?: boolean
}

export interface CellData {
  f?: string
  v?: string | number | boolean | null
  w?: string
  t?: 'n' | 's' | 'b' | 'd'
  nf?: string
  s?: CellStyle
}

export interface SheetData {
  name: string
  cells: Record<string, CellData>
  merges: [number, number, number, number][]
  colWidths: Record<string, number>
  rowHeights: Record<string, number>
  range: [number, number, number, number]
}

export interface ExcelData {
  filename: string
  sheets: SheetData[]
  error?: string
}

export interface MergeInfo {
  rowspan: number
  colspan: number
}

export interface RenderedCell {
  row: number
  col: number
  absRow: number
  absCol: number
  display: string
  rawVal: string
  type: string
  formula: string
  isNum: boolean
  isError: boolean
  style?: CellStyle
  rowspan?: number
  colspan?: number
}

export interface SelectedCellState {
  row: number
  col: number
  display: string
  formula: string
  rawVal: string
  type: string
}
