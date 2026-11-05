import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import SupplierForm from '@/components/suppliers/SupplierForm'
import Button from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Card'
import { inputClass } from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useSuppliers } from '@/hooks/usePurchases'
import { formatCurrency } from '@/lib/formatCurrency'
import { cn } from '@/lib/utils'
import type { Supplier } from '@/types/supplier'

export default function Suppliers() {
  const [searchInput, setSearchInput] = useState('')
  const [archived, setArchived] = useState(false)
  const [page, setPage] = useState(1)
  const search = useDebounce(searchInput.trim(), 300)
  const { data, isPending, isFetching, isError, error } = useSuppliers({
    search: search || undefined,
    is_active: !archived,
    page,
    page_size: 25,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const open = (s: Supplier | null) => {
    setEditing(s)
    setFormOpen(true)
  }

  const totalOwed = data?.items.reduce((a, s) => a + s.balance_owed, 0) ?? 0

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Who you buy from and what you owe them."
        actions={
          <Button onClick={() => open(null)}>
            <Plus className="size-4" /> Add supplier
          </Button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setPage(1)
              }}
              placeholder="Search name, contact or phone…"
              aria-label="Search suppliers"
              className={cn(inputClass, 'pl-9')}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-600 select-none">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => {
                setArchived(e.target.checked)
                setPage(1)
              }}
              className="size-4 accent-brand-600"
            />
            Show archived
          </label>
        </div>

        {isError ? (
          <p className="p-6 text-center text-sm text-red-700">{error.message}</p>
        ) : isPending ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-stone-100" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState>{search ? 'No suppliers match your search' : archived ? 'No archived suppliers' : 'No suppliers yet — add the people you buy stock from.'}</EmptyState>
        ) : (
          <>
            <ul className={cn('divide-y divide-stone-100 transition-opacity', isFetching && 'opacity-60')}>
              {data.items.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => open(s)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-brand-50/50">
                    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{s.name}</p>
                      <p className="truncate text-xs text-ink-400">{[s.contact_person, s.phone].filter(Boolean).join(' · ') || 'No contact details'}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('tabular text-sm font-medium', s.balance_owed > 0 ? 'text-orange-700' : 'text-ink-400')}>
                        {s.balance_owed > 0 ? `Owe ${formatCurrency(s.balance_owed)}` : 'Nothing owed'}
                      </p>
                      <p className="tabular text-xs text-ink-400">
                        {s.purchase_count} purchase{s.purchase_count === 1 ? '' : 's'}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {totalOwed > 0 && data.pages === 1 && (
              <p className="tabular border-t border-stone-100 px-4 py-3 text-right text-sm text-ink-600">
                Total owed to suppliers: <span className="font-semibold text-orange-700">{formatCurrency(totalOwed)}</span>
              </p>
            )}
            <Pagination page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onChange={setPage} noun="suppliers" />
          </>
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? editing.name : 'Add supplier'} size="md">
        {formOpen && <SupplierForm key={editing?.id ?? 'new'} supplier={editing} onClose={() => setFormOpen(false)} />}
      </Modal>
    </>
  )
}
