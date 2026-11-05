import { useState } from 'react'
import { History } from 'lucide-react'
import StockAdjustmentForm from '@/components/inventory/StockAdjustmentForm'
import StockHistory from '@/components/inventory/StockHistory'
import StockTable from '@/components/inventory/StockTable'
import PageHeader from '@/components/layout/PageHeader'
import ProductPicker from '@/components/sales/ProductPicker'
import Card from '@/components/ui/Card'
import { useInventorySummary } from '@/hooks/useInventory'
import { formatCurrency, formatQuantity } from '@/lib/formatCurrency'
import { cn } from '@/lib/utils'
import type { StockMovement } from '@/types/inventory'
import type { Product } from '@/types/product'

type Tab = 'adjust' | 'low' | 'history'

function Summary() {
  const { data } = useInventorySummary()
  const tiles = [
    { label: 'Active products', value: data ? data.active_products.toLocaleString() : '—' },
    { label: 'Low stock', value: data ? String(data.low_stock_count) : '—', tone: data?.low_stock_count ? 'text-orange-700' : '' },
    { label: 'Out of stock', value: data ? String(data.out_of_stock_count) : '—', tone: data?.out_of_stock_count ? 'text-red-700' : '' },
    { label: 'Stock value (cost)', value: data ? formatCurrency(data.stock_value_cost) : '—' },
    { label: 'Stock value (selling)', value: data ? formatCurrency(data.stock_value_retail) : '—' },
  ]
  return (
    <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-xs">
          <dt className="text-xs text-ink-500">{t.label}</dt>
          <dd className={cn('tabular mt-1 text-lg font-semibold text-ink-900', t.tone)}>{t.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function Inventory() {
  const [tab, setTab] = useState<Tab>('adjust')
  const [selected, setSelected] = useState<Product | null>(null)
  const [recent, setRecent] = useState<StockMovement[]>([])

  const startAdjust = (p: Product) => {
    setSelected(p)
    setTab('adjust')
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'adjust', label: 'Adjust stock' },
    { key: 'low', label: 'Low stock' },
    { key: 'history', label: 'Movement history' },
  ]

  return (
    <>
      <PageHeader title="Inventory" description="Count and correct stock, see what's running low, and trace every change." />
      <Summary />

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-stone-100 px-2 pt-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap',
                tab === t.key ? 'border-brand-600 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'adjust' && (
          <div className="flex flex-col gap-4 p-4">
            <p className="text-sm text-ink-600">Search for a product, then enter what you counted or what to add/remove. Do as many as you like, one at a time.</p>
            <ProductPicker onPick={setSelected} requireStock={false} placeholder="Search a product to count or adjust…" />
            {selected && (
              <StockAdjustmentForm
                key={selected.id}
                product={selected}
                onCancel={() => setSelected(null)}
                onDone={(m) => {
                  setRecent((r) => [m, ...r].slice(0, 10))
                  setSelected(null)
                }}
              />
            )}
            {recent.length > 0 && (
              <Card title="Just adjusted" className="shadow-none" bodyClassName="pt-3">
                <ul className="divide-y divide-stone-100">
                  {recent.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-ink-800">
                        {m.product_name} <span className="text-xs text-ink-400">· {m.reason}</span>
                      </span>
                      <span className="tabular shrink-0 text-ink-600">
                        <span className={m.quantity_change > 0 ? 'text-emerald-700' : 'text-orange-700'}>
                          {m.quantity_change > 0 ? '+' : '−'}
                          {formatQuantity(Math.abs(m.quantity_change))}
                        </span>{' '}
                        → {formatQuantity(m.quantity_after)} {m.product_unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {!selected && recent.length === 0 && (
              <p className="flex items-center gap-2 text-xs text-ink-400">
                <History className="size-3.5" aria-hidden /> Every adjustment is kept in the movement history with its reason.
              </p>
            )}
          </div>
        )}
        {tab === 'low' && <StockTable onAdjust={startAdjust} />}
        {tab === 'history' && <StockHistory />}
      </div>
    </>
  )
}
