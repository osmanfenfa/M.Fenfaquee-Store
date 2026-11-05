export type ReportType = 'sales' | 'profit-loss' | 'stock' | 'money-owed'
export type CellKind = 'text' | 'money' | 'qty' | 'int' | 'date' | 'pct'
export type Cell = string | number | null

export interface ReportColumn {
  key: string
  label: string
  kind: CellKind
}

export interface ReportTable {
  title: string
  columns: ReportColumn[]
  rows: Cell[][]
  totals: Cell[] | null
  note: string | null
}

export interface Report {
  type: ReportType
  title: string
  period_label: string
  date_from: string | null
  date_to: string | null
  generated_at: string
  summary: { label: string; value: Cell; kind: CellKind; emphasis: boolean }[]
  tables: ReportTable[]
}
