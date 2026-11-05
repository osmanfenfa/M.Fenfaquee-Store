import { useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/ui/Card'
import { Select } from '@/components/ui/Field'
import Pagination from '@/components/ui/Pagination'
import { useMovements } from '@/hooks/useInventory'
import { formatQuantity } from '@/lib/formatCurrency'
import { periodRange, type PeriodKey } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import { MOVEMENT_LABELS, type MovementType } from '@/types/inventory'

const dateTime = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Every stock change across all products — the audit trail behind stock levels. */
export default function StockHistory() {
  const [type, setType] = useState<MovementType | ''>('')
  const [period, setPeriod] = useState<PeriodKey | 'all'>('7d')
  const [page, setPage] = useState(1)
  const range = period === 'all' ? null : periodRange(period)
  const { data, isPending, isFetching, isError, error } = useMovements({
    movement_type: type || undefined,
    date_from: range?.from,
    date_to: range?.to,
    page,
    page_size: 25,
  })

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-stone-100 p-4 sm:flex-row">
        <Select aria-label="Movement type" value={type} onChange={(e) => { setType(e.target.value as MovementType | ''); setPage(1) }} className="sm:w-52">
          <option value="">All movements</option>
          {(Object.keys(MOVEMENT_LABELS) as MovementType[]).map((t) => (
            <option key={t} value={t}>
              {MOVEMENT_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select aria-label="Period" value={period} onChange={(e) => { setPeriod(e.target.value as PeriodKey | 'all'); setPage(1) }} className="sm:w-40">
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="month">This month</option>
          <option value="last_month">Last month</option>
          <option value="all">All time</option>
        </Select>
      </div>

      {isError ? (
        <p className="p-6 text-center text-sm text-red-700">{error.message}</p>
      ) : isPending ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-stone-100" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState>No stock movements in this period</EmptyState>
      ) : (
        <>
          <ul className={cn('divide-y divide-stone-100 transition-opacity', isFetching && 'opacity-60')}>
            {data.items.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-900">{m.product_name}</p>
                  <p className="truncate text-xs text-ink-400">
                    {dateTime.format(new Date(m.created_at))} · {MOVEMENT_LABELS[m.movement_type]}
                    {m.sale_id ? (
                      <>
                        {' · '}
                        <Link to={`/sales/${m.sale_id}`} className="hover:text-brand-700">
                          {m.reason}
                        </Link>
                      </>
                    ) : m.purchase_id ? (
                      <>
                        {' · '}
                        <Link to={`/purchases/${m.purchase_id}`} className="hover:text-brand-700">
                          {m.reason}
                        </Link>
                      </>
                    ) : (
                      m.reason && ` · ${m.reason}`
                    )}
                  </p>
                </div>
                <div className="tabular text-right">
                  <p className={cn('text-sm font-medium', m.quantity_change > 0 ? 'text-emerald-700' : 'text-ink-900')}>
                    {m.quantity_change > 0 ? '+' : '−'}
                    {formatQuantity(Math.abs(m.quantity_change))} <span className="text-xs font-normal text-ink-400">{m.product_unit}</span>
                  </p>
                  <p className="text-xs text-ink-400">bal. {formatQuantity(m.quantity_after)}</p>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onChange={setPage} noun="movements" />
        </>
      )}
    </>
  )
}
