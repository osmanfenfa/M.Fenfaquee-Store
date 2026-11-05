import Card from '@/components/ui/Card'
import { formatCurrency, formatQuantity } from '@/lib/formatCurrency'
import { formatDate } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import type { Cell, CellKind, Report } from '@/types/report'

const PREVIEW_ROWS = 100
const NUMERIC: CellKind[] = ['money', 'qty', 'int', 'pct']

function fmt(v: Cell, kind: CellKind): string {
  if (v === null || v === '') return ''
  // Labels such as "Total" can sit in a number/date column — show them as text
  if (typeof v === 'string' && kind !== 'text' && kind !== 'date' && Number.isNaN(Number(v))) return v
  switch (kind) {
    case 'money':
      return formatCurrency(Number(v))
    case 'qty':
      return formatQuantity(Number(v))
    case 'int':
      return Number(v).toLocaleString()
    case 'pct':
      return `${Number(v).toFixed(1)}%`
    case 'date':
      return formatDate(String(v))
    default:
      return String(v)
  }
}

export default function ReportPreview({ report, loading }: { report: Report; loading?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-4 transition-opacity', loading && 'opacity-60')}>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {report.summary.map((s) => (
          <div key={s.label} className={cn('rounded-2xl border px-4 py-3', s.emphasis ? 'border-brand-200 bg-brand-50' : 'border-stone-200 bg-white')}>
            <dt className="text-xs text-ink-500">{s.label}</dt>
            <dd className={cn('tabular mt-1 font-semibold text-ink-900', s.emphasis ? 'text-xl' : 'text-lg')}>
              {s.value === null ? '—' : fmt(s.value, s.kind)}
            </dd>
          </div>
        ))}
      </dl>

      {report.tables.map((t) => {
        const shown = t.rows.slice(0, PREVIEW_ROWS)
        return (
          <Card key={t.title} title={t.title} subtitle={`${t.rows.length.toLocaleString()} row${t.rows.length === 1 ? '' : 's'}`} bodyClassName="p-0">
            {t.rows.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-ink-400">Nothing to show for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-sm">
                  <thead>
                    <tr className="border-y border-stone-100 bg-stone-50 text-xs text-ink-500">
                      {t.columns.map((c) => (
                        <th key={c.key} scope="col" className={cn('px-4 py-2 font-medium whitespace-nowrap', NUMERIC.includes(c.kind) ? 'text-right' : 'text-left')}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="tabular divide-y divide-stone-100">
                    {shown.map((row, i) => (
                      <tr key={i}>
                        {row.map((v, j) => {
                          const c = t.columns[j]
                          return (
                            <td
                              key={c.key}
                              className={cn(
                                'px-4 py-2 whitespace-nowrap',
                                NUMERIC.includes(c.kind) ? 'text-right' : 'text-left',
                                typeof v === 'number' && v < 0 ? 'text-red-700' : 'text-ink-800',
                                v === null && j > 0 && row.slice(1).every((x) => x === null) && 'font-semibold text-ink-900',
                              )}
                            >
                              {fmt(v, c.kind)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                  {t.totals && (
                    <tfoot>
                      <tr className="border-t-2 border-ink-900 bg-brand-50/60 font-semibold text-ink-900">
                        {t.totals.map((v, j) => (
                          <td key={j} className={cn('tabular px-4 py-2 whitespace-nowrap', NUMERIC.includes(t.columns[j].kind) ? 'text-right' : 'text-left')}>
                            {fmt(v, t.columns[j].kind)}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
            {(t.rows.length > PREVIEW_ROWS || t.note) && (
              <div className="border-t border-stone-100 px-5 py-3 text-xs text-ink-500">
                {t.rows.length > PREVIEW_ROWS && (
                  <p>
                    Showing the first {PREVIEW_ROWS} of {t.rows.length.toLocaleString()} rows — download the PDF or Excel file for all of them.
                  </p>
                )}
                {t.note && <p>{t.note}</p>}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
