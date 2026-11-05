import Card, { EmptyState } from '@/components/ui/Card'
import { CHART } from '@/lib/chartColors'
import { formatCurrency, formatQuantity } from '@/lib/formatCurrency'
import type { TopProduct } from '@/types/dashboard'

export default function BestSellingProducts({ products }: { products: TopProduct[] }) {
  const max = Math.max(...products.map((p) => p.revenue), 1)
  return (
    <Card title="Best-selling products" subtitle="By revenue in this period">
      {products.length === 0 ? (
        <EmptyState>No sales in this period</EmptyState>
      ) : (
        <ol className="flex flex-col gap-4">
          {products.map((p, i) => (
            <li key={p.product_id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <p className="min-w-0 truncate text-ink-800">
                  <span className="mr-2 text-xs text-ink-400">{i + 1}</span>
                  {p.name}
                </p>
                <p className="tabular shrink-0 font-medium text-ink-900">{formatCurrency(p.revenue)}</p>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-stone-100" aria-hidden>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(p.revenue / max) * 100}%`, background: CHART.revenue }}
                />
              </div>
              <p className="tabular mt-1 text-xs text-ink-500">
                {formatQuantity(p.quantity)} {p.unit} sold · {formatCurrency(p.gross_profit)} profit
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
