import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Field, Input, PrefixedInput, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/context/ToastContext'
import { useDeleteExpense, useExpenseCategories, useSaveExpense } from '@/hooks/useExpenses'
import { CURRENCY, formatCurrency } from '@/lib/formatCurrency'
import { toISODate } from '@/lib/formatDate'
import { ApiError } from '@/services/api'
import type { Expense } from '@/types/expense'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from '@/types/sales'

interface Props {
  expense: Expense | null
  onClose: () => void
  onManageCategories: () => void
}

export default function ExpenseForm({ expense, onClose, onManageCategories }: Props) {
  const toast = useToast()
  const { data: categories = [] } = useExpenseCategories()
  const save = useSaveExpense()
  const remove = useDeleteExpense()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState({
    category_id: expense ? String(expense.category_id) : '',
    expense_date: expense?.expense_date ?? toISODate(new Date()),
    amount: expense ? String(expense.amount) : '',
    description: expense?.description ?? '',
    payment_method: (expense?.payment_method ?? '') as PaymentMethod | '',
    reference: expense?.reference ?? '',
    notes: expense?.notes ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const amount = Number(form.amount)
    if (!form.category_id) errs.category_id = 'Choose a category'
    if (!form.amount || !(amount > 0)) errs.amount = 'Enter the amount'
    if (!form.description.trim()) errs.description = 'What was it for?'
    if (!form.payment_method) errs.payment_method = 'How was it paid?'
    if (form.expense_date > toISODate(new Date())) errs.expense_date = "Date can't be in the future"
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      await save.mutateAsync({
        id: expense?.id,
        data: {
          category_id: Number(form.category_id),
          expense_date: form.expense_date,
          amount,
          description: form.description.trim(),
          payment_method: form.payment_method as PaymentMethod,
          reference: form.reference.trim() || null,
          notes: form.notes.trim() || null,
        },
      })
      toast.success(expense ? 'Expense updated' : `Expense of ${formatCurrency(amount)} recorded`)
      onClose()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Could not save the expense')
    }
  }

  async function doDelete() {
    if (!expense) return
    try {
      await remove.mutateAsync(expense.id)
      toast.success('Expense deleted')
      onClose()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Could not delete the expense')
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount" required error={errors.amount}>
          {(id, d) => (
            <PrefixedInput prefix={CURRENCY} id={id} aria-describedby={d} aria-invalid={!!errors.amount} type="number" inputMode="decimal" min="0" step="0.01" value={form.amount} onChange={set('amount')} autoFocus={!expense} />
          )}
        </Field>
        <Field label="Date" error={errors.expense_date}>
          {(id) => <Input id={id} type="date" max={toISODate(new Date())} value={form.expense_date} onChange={set('expense_date')} />}
        </Field>
      </div>
      <Field
        label="Category"
        required
        error={errors.category_id}
        hint={
          <button type="button" onClick={onManageCategories} className="text-brand-700 hover:underline">
            Manage categories
          </button>
        }
      >
        {(id, d) => (
          <Select id={id} aria-describedby={d} aria-invalid={!!errors.category_id} value={form.category_id} onChange={set('category_id')}>
            <option value="">Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Description" required error={errors.description}>
        {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.description} value={form.description} onChange={set('description')} placeholder="e.g. EDSA electricity top-up" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paid by" required error={errors.payment_method}>
          {(id, d) => (
            <Select id={id} aria-describedby={d} aria-invalid={!!errors.payment_method} value={form.payment_method} onChange={set('payment_method')}>
              <option value="">Choose…</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Reference">{(id) => <Input id={id} value={form.reference} onChange={set('reference')} placeholder="Receipt / txn no." />}</Field>
      </div>
      <Field label="Notes">{(id) => <Textarea id={id} rows={2} value={form.notes} onChange={set('notes')} />}</Field>

      <div className="-mx-5 -mb-4 flex flex-wrap items-center justify-center gap-2 border-t border-stone-100 px-5 py-3 sm:justify-end">
        {expense &&
          (confirmDelete ? (
            <span className="mr-auto flex items-center gap-2 text-sm text-ink-600">
              Delete?
              <Button size="sm" variant="danger" onClick={doDelete} loading={remove.isPending}>
                Yes, delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                No
              </Button>
            </span>
          ) : (
            <Button variant="ghost" className="mr-auto" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" /> Delete
            </Button>
          ))}
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {expense ? 'Save' : 'Add expense'}
        </Button>
      </div>
    </form>
  )
}
