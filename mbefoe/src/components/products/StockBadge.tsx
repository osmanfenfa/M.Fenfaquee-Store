import { AlertTriangle, PackageX } from 'lucide-react'
import { formatQuantity } from '@/lib/formatCurrency'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/product'

/** Stock level with a status icon + word — never colour alone. */
export default function StockBadge({ product, className }: { product: Pick<Product, 'stock_quantity' | 'unit' | 'is_low_stock'>; className?: string }) {
  const out = product.stock_quantity <= 0
  return (
    <span className={cn('tabular inline-flex items-center gap-1.5', className)}>
      {out ? (
        <PackageX className="size-3.5 text-red-600" aria-hidden />
      ) : product.is_low_stock ? (
        <AlertTriangle className="size-3.5 text-orange-500" aria-hidden />
      ) : null}
      <span className={cn(out ? 'text-red-700' : product.is_low_stock ? 'text-orange-700' : 'text-ink-900')}>
        {formatQuantity(product.stock_quantity)} <span className="text-ink-400">{product.unit}</span>
      </span>
      {(out || product.is_low_stock) && <span className="sr-only">{out ? '(out of stock)' : '(low stock)'}</span>}
    </span>
  )
}
