import { ShoppingCart, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router'
import StockBadge from '@/components/products/StockBadge'
import Button, { buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Card'
import { useLowStock } from '@/hooks/useInventory'
import { formatQuantity } from '@/lib/formatCurrency'
import type { Product } from '@/types/product'

/** Products at or below their reorder level — emptiest first. */
export default function StockTable({ onAdjust }: { onAdjust: (p: Product) => void }) {
  const { data, isPending } = useLowStock()

  if (isPending)
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-stone-100" />
        ))}
      </div>
    )
  if (!data?.length) return <EmptyState>Nothing is running low — all products are above their reorder level.</EmptyState>

  return (
    <>
      <ul className="divide-y divide-stone-100">
        {data.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">{p.name}</p>
              <p className="tabular text-xs text-ink-400">
                {p.category_name ? `${p.category_name} · ` : ''}reorder at {formatQuantity(p.reorder_level)} {p.unit}
              </p>
            </div>
            <StockBadge product={p} className="text-sm" />
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onAdjust(p)} aria-label={`Adjust stock of ${p.name}`} title="Adjust stock">
                <SlidersHorizontal className="size-4" />
              </Button>
              <Link to="/purchases/new" className={buttonStyles('secondary', 'sm')}>
                <ShoppingCart className="size-3.5" /> Buy
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-stone-100 px-4 py-3 text-xs text-ink-500">
        {data.length} product{data.length === 1 ? '' : 's'} need restocking. Change a product's reorder level on the Products page.
      </p>
    </>
  )
}
