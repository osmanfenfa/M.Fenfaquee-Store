import { EmptyState } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/formatCurrency'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/product'
import StockBadge from './StockBadge'

interface Props {
  products: Product[]
  onSelect: (p: Product) => void
  loading?: boolean
  emptyMessage: string
}

export default function ProductTable({ products, onSelect, loading, emptyMessage }: Props) {
  if (!loading && products.length === 0) return <EmptyState>{emptyMessage}</EmptyState>

  return (
    <div className={cn('transition-opacity', loading && 'opacity-60')}>
      {/* Desktop table */}
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-stone-100 text-left text-xs text-ink-500">
            <th className="px-4 py-2.5 font-medium">Product</th>
            <th className="px-4 py-2.5 font-medium">Category</th>
            <th className="px-4 py-2.5 text-right font-medium">Cost</th>
            <th className="px-4 py-2.5 text-right font-medium">Price</th>
            <th className="px-4 py-2.5 text-right font-medium">In stock</th>
            <th className="hidden px-4 py-2.5 text-right font-medium xl:table-cell">Stock value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {products.map((p) => (
            <tr
              key={p.id}
              onClick={() => onSelect(p)}
              className={cn('cursor-pointer transition-colors hover:bg-brand-50/50', !p.is_active && 'opacity-60')}
            >
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(p)
                  }}
                  className="text-left font-medium text-ink-900 hover:text-brand-700 focus-visible:underline focus-visible:outline-none"
                >
                  {p.name}
                </button>
                <p className="text-xs text-ink-400">
                  {p.sku ?? 'No SKU'}
                  {!p.is_active && ' · Archived'}
                </p>
              </td>
              <td className="px-4 py-3 text-ink-600">{p.category_name ?? <span className="text-ink-300">—</span>}</td>
              <td className="tabular px-4 py-3 text-right text-ink-600">{formatCurrency(p.cost_price)}</td>
              <td className="tabular px-4 py-3 text-right font-medium text-ink-900">{formatCurrency(p.selling_price)}</td>
              <td className="px-4 py-3 text-right">
                <StockBadge product={p} />
              </td>
              <td className="tabular hidden px-4 py-3 text-right text-ink-600 xl:table-cell">{formatCurrency(p.stock_value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile list */}
      <ul className="divide-y divide-stone-100 md:hidden">
        {products.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p)}
              className={cn('flex w-full items-center gap-3 px-4 py-3 text-left active:bg-stone-50', !p.is_active && 'opacity-60')}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{p.name}</p>
                <p className="truncate text-xs text-ink-400">
                  {[p.sku, p.category_name, !p.is_active && 'Archived'].filter(Boolean).join(' · ') || 'No SKU'}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="tabular font-medium text-ink-900">{formatCurrency(p.selling_price)}</p>
                <StockBadge product={p} className="text-xs" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
