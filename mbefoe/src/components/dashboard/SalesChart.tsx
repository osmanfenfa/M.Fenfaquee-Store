import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from '@/components/ui/Card'
import { CHART } from '@/lib/chartColors'
import { formatDate, formatMonth, formatShortDate } from '@/lib/formatDate'
import type { TrendPoint } from '@/types/dashboard'

interface Props {
  data: TrendPoint[]
  grouping: 'day' | 'month'
}

function ChartTooltip({ active, payload, grouping }: { active?: boolean; payload?: { payload: TrendPoint }[]; grouping: 'day' | 'month' }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink-900">{grouping === 'month' ? formatMonth(p.period) : formatDate(p.period)}</p>
      <p className="tabular mt-1 text-ink-600">
        {p.sales_count} sale{p.sales_count === 1 ? '' : 's'}
      </p>
    </div>
  )
}

/** Number of sales per day/month — a single series, so no legend; the title names it. */
export default function SalesChart({ data, grouping }: Props) {
  const tick = grouping === 'month' ? formatMonth : formatShortDate
  return (
    <Card title="Number of sales" subtitle={grouping === 'month' ? 'By month' : 'By day'}>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
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
              allowDecimals={false}
              tick={{ fontSize: 11, fill: CHART.axis }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip content={<ChartTooltip grouping={grouping} />} cursor={{ fill: '#f5f5f4' }} />
            <Bar dataKey="sales_count" fill={CHART.revenue} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
