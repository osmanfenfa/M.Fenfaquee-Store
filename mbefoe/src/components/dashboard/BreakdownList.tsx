import Card, { EmptyState } from '@/components/ui/Card'
import { CHART } from '@/lib/chartColors'
import { formatCurrency } from '@/lib/formatCurrency'

interface Row {
  key: string | number
  label: string
  amount: number
}

interface Props {
  title: string
  subtitle?: string
  rows: Row[]
  empty: string
  total?: number
}

/** A single-series horizontal bar list (expenses by category, money in by method). */
export default function BreakdownList({ title, subtitle, rows, empty, total }: Props) {
  const sum = total ?? rows.reduce((a, r) => a + r.amount, 0)
  return (
    <Card title={title} subtitle={subtitle}>
      {rows.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const pct = sum ? (r.amount / sum) * 100 : 0
            return (
              <li key={r.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-ink-700">{r.label}</span>
                  <span className="tabular shrink-0 text-ink-900">
                    {formatCurrency(r.amount)}
                    <span className="ml-2 inline-block w-9 text-right text-xs text-ink-400">{pct.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-stone-100" aria-hidden>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHART.neutral }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
