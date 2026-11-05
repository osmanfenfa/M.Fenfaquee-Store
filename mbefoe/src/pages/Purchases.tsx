import { useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import PageHeader from '@/components/layout/PageHeader'
import PurchaseTable from '@/components/purchases/PurchaseTable'
import { buttonStyles } from '@/components/ui/Button'
import { inputClass, Select } from '@/components/ui/Field'
import Pagination from '@/components/ui/Pagination'
import { useDebounce } from '@/hooks/useDebounce'
import { usePurchases, useSupplierOptions } from '@/hooks/usePurchases'
import { periodRange, type PeriodKey } from '@/lib/formatDate'
import { cn } from '@/lib/utils'

type View = 'all' | 'owing' | 'ordered' | 'cancelled'
const VIEWS: { key: View; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'owing', label: 'Unpaid' },
  { key: 'ordered', label: 'Awaiting delivery' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default function Purchases() {
  const [params, setParams] = useSearchParams()
  const supplierId = params.get('supplier') ? Number(params.get('supplier')) : undefined
  const { data: suppliers = [] } = useSupplierOptions()

  const [view, setView] = useState<View>('all')
  const [period, setPeriod] = useState<PeriodKey | 'all'>(supplierId ? 'all' : 'month')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounce(searchInput.trim(), 300)
  const range = period === 'all' ? null : periodRange(period)

  const { data, isPending, isFetching, isError, error } = usePurchases({
    search: search || undefined,
    supplier_id: supplierId,
    date_from: range?.from,
    date_to: range?.to,
    outstanding: view === 'owing' || undefined,
    status: view === 'ordered' ? 'ordered' : view === 'cancelled' ? 'cancelled' : undefined,
    page,
    page_size: 25,
  })

  const supplierName = suppliers.find((s) => s.id === supplierId)?.name

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Stock bought from suppliers."
        actions={
          <Link to="/purchases/new" className={buttonStyles()}>
            <Plus className="size-4" /> Record purchase
          </Link>
        }
      />

      {supplierId && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 py-1 pr-1 pl-3 text-sm text-brand-900">
          Supplier: {supplierName ?? `#${supplierId}`}
          <button type="button" onClick={() => setParams({})} className="rounded-full p-1 hover:bg-brand-100" aria-label="Clear supplier filter">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 lg:flex-row lg:items-center">
          <div className="flex overflow-x-auto rounded-full border border-stone-300 bg-white p-0.5 text-xs font-medium" role="radiogroup" aria-label="Show">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                role="radio"
                aria-checked={view === v.key}
                onClick={() => {
                  setView(v.key)
                  setPage(1)
                }}
                className={cn('flex-1 rounded-full px-3 py-1.5 whitespace-nowrap', view === v.key ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-stone-100')}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setPage(1)
              }}
              placeholder="Search reference, invoice or supplier…"
              aria-label="Search purchases"
              className={cn(inputClass, 'pl-9')}
            />
          </div>
          <Select
            aria-label="Period"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value as PeriodKey | 'all')
              setPage(1)
            }}
            className="lg:w-40"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="month">This month</option>
            <option value="last_month">Last month</option>
            <option value="year">This year</option>
            <option value="all">All time</option>
          </Select>
        </div>

        {isError ? (
          <p className="p-6 text-center text-sm text-red-700">{error.message}</p>
        ) : isPending ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-stone-100" />
            ))}
          </div>
        ) : (
          <>
            <PurchaseTable
              purchases={data.items}
              loading={isFetching}
              emptyMessage={view === 'owing' ? "You don't owe any supplier in this period" : search ? 'No purchases match your search' : 'No purchases in this period'}
            />
            <Pagination page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onChange={setPage} noun="purchases" />
          </>
        )}
      </div>
    </>
  )
}
