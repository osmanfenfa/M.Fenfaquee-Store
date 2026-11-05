import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from '@/components/ui/Card'
import { CHART } from '@/lib/chartColors'
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatCurrency'
import { formatDate, formatMonth, formatShortDate } from '@/lib/formatDate'
import type { TrendPoint } from '@/types/dashboard'

interface Props {
  data: TrendPoint[]
  grouping: 'day' | 'month'
}

const SERIES = [
  { key: 'revenue', label: 'Revenue', color: CHART.revenue },
  { key: 'gross_profit', label: 'Gross profit', color: CHART.profit },
] as const

interface TooltipProps {
  active?: boolean
  payload?: { payload: TrendPoint }[]
  grouping: 'day' | 'month'
}

function ChartTooltip({ active, payload, grouping }: TooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-ink-900">
        {grouping === 'month' ? formatMonth(p.period) : formatDate(p.period)}
      </p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center gap-2 text-ink-600">
          <span className="size-2 rounded-full" style={{ background: s.color }} />
          {s.label}
          <span className="tabular ml-auto pl-4 font-medium text-ink-900">{formatCurrency(p[s.key])}</span>
        </p>
      ))}
      <p className="mt-1 text-ink-400">
        {p.sales_count} sale{p.sales_count === 1 ? '' : 's'}
      </p>
    </div>
  )
}

export default function RevenueChart({ data, grouping }: Props) {
  const tick = grouping === 'month' ? formatMonth : formatShortDate
  const hasData = data.some((d) => d.revenue !== 0)

  return (
    <Card
      title="Revenue & gross profit"
      subtitle={grouping === 'month' ? 'By month' : 'By day'}
      action={
        <div className="flex items-center gap-4 text-xs text-ink-600" aria-label="Legend">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      }
    >
      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis
              dataKey="period"
              tickFormatter={tick}
              tick={{ fontSize: 11, fill: CHART.axis }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={formatCurrencyCompact}
              tick={{ fontSize: 11, fill: CHART.axis }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              content={<ChartTooltip grouping={grouping} />}
              cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }}
            />
            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#fill-${s.key})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        {!hasData && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-ink-400">
            No sales in this period yet
          </p>
        )}
      </div>

      <details className="mt-3 text-xs text-ink-500">
        <summary className="cursor-pointer select-none hover:text-ink-700">View as table</summary>
        <div className="mt-2 max-h-56 overflow-auto">
          <table className="w-full text-left">
            <thead className="text-ink-400">
              <tr>
                <th className="py-1 font-medium">{grouping === 'month' ? 'Month' : 'Date'}</th>
                <th className="py-1 text-right font-medium">Revenue</th>
                <th className="py-1 text-right font-medium">Gross profit</th>
                <th className="py-1 text-right font-medium">Sales</th>
              </tr>
            </thead>
            <tbody className="tabular text-ink-700">
              {data.map((d) => (
                <tr key={d.period} className="border-t border-stone-100">
                  <td className="py-1">{tick(d.period)}</td>
                  <td className="py-1 text-right">{formatCurrency(d.revenue)}</td>
                  <td className="py-1 text-right">{formatCurrency(d.gross_profit)}</td>
                  <td className="py-1 text-right">{d.sales_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  )
}
