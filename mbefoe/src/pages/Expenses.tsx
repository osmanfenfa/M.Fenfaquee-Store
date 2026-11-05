import { useState } from 'react'
import { Plus, Search, Tags } from 'lucide-react'
import ExpenseCategoryManager from '@/components/expenses/ExpenseCategoryManager'
import ExpenseForm from '@/components/expenses/ExpenseForm'
import ExpenseTable from '@/components/expenses/ExpenseTable'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import { inputClass, Select } from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useExpenseCategories, useExpenses, useExpenseSummary } from '@/hooks/useExpenses'
import { formatCurrency } from '@/lib/formatCurrency'
import { periodRange, type PeriodKey } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import type { Expense } from '@/types/expense'

const PERIOD_LABEL: Record<PeriodKey, string> = {
  today: 'today',
  '7d': 'in the last 7 days',
  month: 'this month',
  last_month: 'last month',
  year: 'this year',
}

export default function Expenses() {
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [categoryId, setCategoryId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounce(searchInput.trim(), 300)
  const { from, to } = periodRange(period)

  const { data: categories = [] } = useExpenseCategories()
  const { data: summary } = useExpenseSummary(from, to)
  const { data, isPending, isFetching, isError, error } = useExpenses({
    date_from: from,
    date_to: to,
    category_id: categoryId ? Number(categoryId) : undefined,
    search: search || undefined,
    page,
    page_size: 25,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [catsOpen, setCatsOpen] = useState(false)
  const openForm = (e: Expense | null) => {
    setEditing(e)
    setFormOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Rent, power, transport and other running costs."
        actions={
          <>
            <Button variant="secondary" onClick={() => setCatsOpen(true)}>
              <Tags className="size-4" /> Categories
            </Button>
            <Button onClick={() => openForm(null)}>
              <Plus className="size-4" /> Add expense
            </Button>
          </>
        }
      />

      {/* Period total + category chips (click to filter) */}
      <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
        <p className="text-sm text-ink-500">Spent {PERIOD_LABEL[period]}</p>
        <p className="tabular mt-0.5 text-2xl font-semibold text-ink-900">{formatCurrency(summary?.total ?? 0)}</p>
        {summary && summary.by_category.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {summary.by_category.map((c) => {
              const active = categoryId === String(c.category_id)
              return (
                <button
                  key={c.category_id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setCategoryId(active ? '' : String(c.category_id))
                    setPage(1)
                  }}
                  className={cn(
                    'tabular rounded-full border px-2.5 py-1 text-xs transition',
                    active ? 'border-ink-900 bg-ink-900 text-white' : 'border-stone-200 bg-stone-50 text-ink-700 hover:border-stone-300',
                  )}
                >
                  {c.category_name} · {formatCurrency(c.total)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="flex flex-col gap-2 border-b border-stone-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setPage(1)
              }}
              placeholder="Search descriptions…"
              aria-label="Search expenses"
              className={cn(inputClass, 'pl-9')}
            />
          </div>
          <Select aria-label="Category" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1) }} className="sm:w-48">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Period" value={period} onChange={(e) => { setPeriod(e.target.value as PeriodKey); setPage(1) }} className="sm:w-40">
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="month">This month</option>
            <option value="last_month">Last month</option>
            <option value="year">This year</option>
          </Select>
        </div>

        {isError ? (
          <p className="p-6 text-center text-sm text-red-700">{error.message}</p>
        ) : isPending ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-stone-100" />
            ))}
          </div>
        ) : (
          <>
            <ExpenseTable expenses={data.items} loading={isFetching} onSelect={openForm} emptyMessage={search || categoryId ? 'No expenses match these filters' : 'No expenses recorded in this period'} />
            <Pagination page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onChange={setPage} noun="expenses" />
          </>
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit expense' : 'Add expense'}>
        {formOpen && (
          <ExpenseForm
            key={editing?.id ?? 'new'}
            expense={editing}
            onClose={() => setFormOpen(false)}
            onManageCategories={() => setCatsOpen(true)}
          />
        )}
      </Modal>
      <Modal open={catsOpen} onClose={() => setCatsOpen(false)} title="Expense categories" size="sm">
        {catsOpen && <ExpenseCategoryManager />}
      </Modal>
    </>
  )
}
