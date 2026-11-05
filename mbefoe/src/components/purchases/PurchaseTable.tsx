import { useNavigate } from 'react-router'
import { EmptyState } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/formatCurrency'
import { formatDate } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import type { PurchaseSummary } from '@/types/purchase'
import PurchaseStatusBadge from './PurchaseStatusBadge'

export default function PurchaseTable({ purchases, loading, emptyMessage }: { purchases: PurchaseSummary[]; loading?: boolean; emptyMessage: string }) {
  const navigate = useNavigate()
  if (!loading && purchases.length === 0) return <EmptyState>{emptyMessage}</EmptyState>
  const go = (id: number) => navigate(`/purchases/${id}`)

  return (
    <div className={cn('transition-opacity', loading && 'opacity-60')}>
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-stone-100 text-left text-xs text-ink-500">
            <th className="px-4 py-2.5 font-medium">Purchase</th>
            <th className="px-4 py-2.5 font-medium">Supplier</th>
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-4 py-2.5 text-right font-medium">Total</th>
            <th className="px-4 py-2.5 text-right font-medium">You owe</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {purchases.map((p) => (
            <tr key={p.id} onClick={() => go(p.id)} className="cursor-pointer hover:bg-brand-50/50">
              <td className="px-4 py-3">
                <a
                  href={`/purchases/${p.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    go(p.id)
                  }}
                  className="font-medium text-ink-900 hover:text-brand-700"
                >
                  {p.reference}
                </a>
                <p className="text-xs text-ink-400">{p.supplier_invoice_no ? `Inv. ${p.supplier_invoice_no}` : `${p.item_count} item${p.item_count === 1 ? '' : 's'}`}</p>
              </td>
              <td className="px-4 py-3 text-ink-700">{p.supplier_name ?? <span className="text-ink-400">—</span>}</td>
              <td className="px-4 py-3 text-ink-600">{formatDate(p.purchase_date)}</td>
              <td className={cn('tabular px-4 py-3 text-right font-medium', p.status === 'cancelled' ? 'text-ink-400 line-through' : 'text-ink-900')}>
                {formatCurrency(p.total)}
              </td>
              <td className="tabular px-4 py-3 text-right text-ink-600">
                {p.status !== 'cancelled' && p.balance_due > 0 ? formatCurrency(p.balance_due) : <span className="text-ink-300">—</span>}
              </td>
              <td className="px-4 py-3">
                <PurchaseStatusBadge status={p.status} paymentStatus={p.payment_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-stone-100 md:hidden">
        {purchases.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => go(p.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-stone-50">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{p.supplier_name ?? 'No supplier'}</p>
                <p className="text-xs text-ink-400">
                  {p.reference} · {formatDate(p.purchase_date)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className={cn('tabular text-sm font-medium', p.status === 'cancelled' ? 'text-ink-400 line-through' : 'text-ink-900')}>{formatCurrency(p.total)}</p>
                <PurchaseStatusBadge status={p.status} paymentStatus={p.payment_status} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
