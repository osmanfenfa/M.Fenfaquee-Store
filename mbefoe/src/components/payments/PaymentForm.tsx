import { useState, type FormEvent } from 'react'
import Button from '@/components/ui/Button'
import { Field, Input, PrefixedInput, Select, Textarea } from '@/components/ui/Field'
import { CURRENCY, formatCurrency } from '@/lib/formatCurrency'
import { toISODate } from '@/lib/formatDate'
import { ApiError } from '@/services/api'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentInput, type PaymentMethod } from '@/types/sales'

interface Props {
  balance: number
  /** Earliest allowed payment date (the sale/purchase date) */
  minDate: string
  balanceLabel: string
  submitLabel: string
  onSubmit: (data: PaymentInput) => Promise<void>
  onCancel: () => void
}

/** Record a later payment against a sale (money in) or a purchase (money out). */
export default function PaymentForm({ balance, minDate, balanceLabel, submitLabel, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const n = Number(amount)
    if (!amount || !(n > 0)) return setError('Enter the amount')
    if (n > balance) return setError(`Can't be more than the balance (${formatCurrency(balance)})`)
    if (!method) return setError('Choose the payment method')
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ amount: n, method, payment_date: date, reference: reference.trim() || null, notes: notes.trim() || null })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record the payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-900">
        {balanceLabel}: <span className="tabular font-semibold">{formatCurrency(balance)}</span>
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <Field label="Amount" required>
        {(id) => (
          <div className="flex gap-2">
            <div className="flex-1">
              <PrefixedInput prefix={CURRENCY} id={id} type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            </div>
            <Button variant="secondary" onClick={() => setAmount(String(balance))}>
              Full balance
            </Button>
          </div>
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Method" required>
          {(id) => (
            <Select id={id} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod | '')}>
              <option value="">Choose…</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Date">
          {(id) => <Input id={id} type="date" min={minDate} max={toISODate(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
      </div>
      <Field label="Reference" hint="Mobile money / bank transaction ID">
        {(id, d) => <Input id={id} aria-describedby={d} value={reference} onChange={(e) => setReference(e.target.value)} />}
      </Field>
      <Field label="Notes">{(id) => <Textarea id={id} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
      <div className="-mx-5 -mb-4 flex justify-center gap-2 border-t border-stone-100 px-5 py-3 sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
