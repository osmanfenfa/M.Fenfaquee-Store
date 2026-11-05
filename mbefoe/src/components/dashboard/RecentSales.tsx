import { Link } from 'react-router'
import SaleStatusBadge from '@/components/sales/SaleStatusBadge'
import Card, { EmptyState } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/formatCurrency'
import { formatShortDate } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import type { SaleSummary } from '@/types/sales'

export default function RecentSales({ sales }: { sales: SaleSummary[] }) {
  return (
    <Card
      title="Recent sales"
      action={
        <Link to="/sales" className="text-xs font-medium text-brand-700 hover:text-brand-800">
          View all
        </Link>
      }
    >
      {sales.length === 0 ? (
        <EmptyState>No sales recorded yet</EmptyState>
      ) : (
        <ul className="divide-y divide-stone-100">
          {sales.map((s) => (
            <li key={s.id}>
              <Link to={`/sales/${s.id}`} className="flex items-center gap-3 py-2.5 hover:bg-stone-50/60">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-800">{s.customer_name || 'Walk-in customer'}</p>
                  <p className="text-xs text-ink-400">
                    {s.reference} · {formatShortDate(s.sale_date)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className={cn('tabular text-sm font-medium', s.status === 'voided' ? 'text-ink-400 line-through' : 'text-ink-900')}>
                    {formatCurrency(s.total)}
                  </p>
                  <SaleStatusBadge status={s.status} paymentStatus={s.payment_status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
