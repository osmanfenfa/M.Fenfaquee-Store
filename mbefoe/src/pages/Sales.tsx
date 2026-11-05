import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Link } from 'react-router'
import PageHeader from '@/components/layout/PageHeader'
import SaleTable from '@/components/sales/SaleTable'
import { buttonStyles } from '@/components/ui/Button'
import { inputClass, Select } from '@/components/ui/Field'
import Pagination from '@/components/ui/Pagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useSales } from '@/hooks/useSales'
import { periodRange, type PeriodKey } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import type { SaleFilters } from '@/types/sales'

type View = 'all' | 'owing' | 'voided'
const VIEWS: { key: View; label: string }[] = [
  { key: 'all', label: 'All sales' },
  { key: 'owing', label: 'Money owed' },
  { key: 'voided', label: 'Voided' },
]

export default function Sales() {
  const [view, setView] = useState<View>('all')
  const [period, setPeriod] = useState<PeriodKey | 'all'>('month')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounce(searchInput.trim(), 300)

  const range = period === 'all' ? null : periodRange(period)
  const filters: SaleFilters = {
    search: search || undefined,
    date_from: range?.from,
    date_to: range?.to,
    outstanding: view === 'owing' || undefined,
    status: view === 'voided' ? 'voided' : undefined,
    page,
    page_size: 25,
  }
  const { data, isPending, isFetching, isError, error } = useSales(filters)

  // Any filter change goes back to page 1
  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Sales"
        description="Record sales, take payments on credit and void mistakes."
        actions={
          <Link to="/sales/new" className={buttonStyles()}>
            <Plus className="size-4" /> Record sale
          </Link>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 lg:flex-row lg:items-center">
          <div className="flex rounded-full border border-stone-300 bg-white p-0.5 text-xs font-medium" role="radiogroup" aria-label="Show">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                role="radio"
                aria-checked={view === v.key}
                onClick={() => reset(setView)(v.key)}
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
              onChange={(e) => reset(setSearchInput)(e.target.value)}
              placeholder="Search reference or customer…"
              aria-label="Search sales"
              className={cn(inputClass, 'pl-9')}
            />
          </div>
          <Select aria-label="Period" value={period} onChange={(e) => reset(setPeriod)(e.target.value as PeriodKey | 'all')} className="lg:w-40">
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
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-stone-100" />
            ))}
          </div>
        ) : (
          <>
            <SaleTable
              sales={data.items}
              loading={isFetching}
              emptyMessage={view === 'owing' ? 'Nobody owes you money in this period' : search ? 'No sales match your search' : 'No sales in this period'}
            />
            <Pagination page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onChange={setPage} noun="sales" />
          </>
        )}
      </div>
    </>
  )
}
