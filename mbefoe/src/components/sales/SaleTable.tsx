import { useNavigate } from 'react-router'
import { EmptyState } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/formatCurrency'
import { formatDate } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import type { SaleSummary } from '@/types/sales'
import SaleStatusBadge from './SaleStatusBadge'

export default function SaleTable({ sales, loading, emptyMessage }: { sales: SaleSummary[]; loading?: boolean; emptyMessage: string }) {
  const navigate = useNavigate()
  if (!loading && sales.length === 0) return <EmptyState>{emptyMessage}</EmptyState>

  return (
    <div className={cn('transition-opacity', loading && 'opacity-60')}>
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-stone-100 text-left text-xs text-ink-500">
            <th className="px-4 py-2.5 font-medium">Sale</th>
            <th className="px-4 py-2.5 font-medium">Customer</th>
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-4 py-2.5 text-right font-medium">Total</th>
            <th className="px-4 py-2.5 text-right font-medium">Balance</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {sales.map((s) => (
            <tr key={s.id} onClick={() => navigate(`/sales/${s.id}`)} className="cursor-pointer hover:bg-brand-50/50">
              <td className="px-4 py-3">
                <a
                  href={`/sales/${s.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(`/sales/${s.id}`)
                  }}
                  className="font-medium text-ink-900 hover:text-brand-700"
                >
                  {s.reference}
                </a>
                <p className="text-xs text-ink-400">
                  {s.item_count} item{s.item_count === 1 ? '' : 's'}
                </p>
              </td>
              <td className="px-4 py-3 text-ink-700">{s.customer_name ?? <span className="text-ink-400">Walk-in</span>}</td>
              <td className="px-4 py-3 text-ink-600">{formatDate(s.sale_date)}</td>
              <td className={cn('tabular px-4 py-3 text-right font-medium', s.status === 'voided' ? 'text-ink-400 line-through' : 'text-ink-900')}>
                {formatCurrency(s.total)}
              </td>
              <td className="tabular px-4 py-3 text-right text-ink-600">
                {s.status === 'completed' && s.balance_due > 0 ? formatCurrency(s.balance_due) : <span className="text-ink-300">—</span>}
              </td>
              <td className="px-4 py-3">
                <SaleStatusBadge status={s.status} paymentStatus={s.payment_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-stone-100 md:hidden">
        {sales.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => navigate(`/sales/${s.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-stone-50">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{s.customer_name ?? 'Walk-in customer'}</p>
                <p className="text-xs text-ink-400">
                  {s.reference} · {formatDate(s.sale_date)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className={cn('tabular text-sm font-medium', s.status === 'voided' ? 'text-ink-400 line-through' : 'text-ink-900')}>{formatCurrency(s.total)}</p>
                <SaleStatusBadge status={s.status} paymentStatus={s.payment_status} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
