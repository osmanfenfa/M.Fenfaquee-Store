import { EmptyState } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/formatCurrency'
import { formatDate } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import type { Expense } from '@/types/expense'
import { PAYMENT_METHOD_LABELS } from '@/types/sales'

export default function ExpenseTable({ expenses, loading, onSelect, emptyMessage }: { expenses: Expense[]; loading?: boolean; onSelect: (e: Expense) => void; emptyMessage: string }) {
  if (!loading && expenses.length === 0) return <EmptyState>{emptyMessage}</EmptyState>
  return (
    <ul className={cn('divide-y divide-stone-100 transition-opacity', loading && 'opacity-60')}>
      {expenses.map((e) => (
        <li key={e.id}>
          <button type="button" onClick={() => onSelect(e)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-brand-50/50">
            <div className="hidden w-24 shrink-0 text-sm text-ink-500 sm:block">{formatDate(e.expense_date)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink-900">{e.description}</p>
              <p className="truncate text-xs text-ink-400">
                <span className="sm:hidden">{formatDate(e.expense_date)} · </span>
                {e.category_name} · {PAYMENT_METHOD_LABELS[e.payment_method]}
                {e.reference && ` · ${e.reference}`}
              </p>
            </div>
            <p className="tabular text-sm font-medium text-ink-900">{formatCurrency(e.amount)}</p>
          </button>
        </li>
      ))}
    </ul>
  )
}
