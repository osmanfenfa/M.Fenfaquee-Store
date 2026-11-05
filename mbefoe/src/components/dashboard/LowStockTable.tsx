import { AlertTriangle, PackageX } from 'lucide-react'
import { Link } from 'react-router'
import Card, { EmptyState } from '@/components/ui/Card'
import { formatQuantity } from '@/lib/formatCurrency'
import type { LowStockItem } from '@/types/dashboard'

interface Props {
  items: LowStockItem[]
  totalLow: number
}

export default function LowStockTable({ items, totalLow }: Props) {
  return (
    <Card
      title="Low stock"
      subtitle={totalLow ? `${totalLow} product${totalLow === 1 ? '' : 's'} at or below reorder level` : undefined}
      action={
        totalLow > items.length ? (
          <Link to="/inventory" className="text-xs font-medium text-brand-700 hover:text-brand-800">
            View all
          </Link>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <EmptyState>All products are well stocked</EmptyState>
      ) : (
        <ul className="divide-y divide-stone-100">
          {items.map((p) => {
            const out = p.stock_quantity <= 0
            const Icon = out ? PackageX : AlertTriangle
            return (
              <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <Icon className={out ? 'size-4 shrink-0 text-red-600' : 'size-4 shrink-0 text-orange-500'} aria-hidden />
                <p className="min-w-0 flex-1 truncate text-sm text-ink-800">{p.name}</p>
                <div className="text-right">
                  <p className={`tabular text-sm font-medium ${out ? 'text-red-700' : 'text-ink-900'}`}>
                    {out ? 'Out of stock' : `${formatQuantity(p.stock_quantity)} ${p.unit}`}
                  </p>
                  <p className="tabular text-xs text-ink-400">reorder at {formatQuantity(p.reorder_level)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
