import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, ShoppingBasket, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Field, Input, PrefixedInput, Select, Textarea, inputClass } from '@/components/ui/Field'
import { useToast } from '@/context/ToastContext'
import { useCreateSale } from '@/hooks/useSales'
import { CURRENCY, formatCurrency, formatQuantity } from '@/lib/formatCurrency'
import { toISODate } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import type { Product } from '@/types/product'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from '@/types/sales'
import ProductPicker from './ProductPicker'

interface Line {
  key: number
  productId: number
  name: string
  unit: string
  stock: number
  listPrice: number
  quantity: string
  unitPrice: string
  discount: string
}

const cents = (n: number) => Math.round(n * 100) / 100
const toNum = (s: string) => (s.trim() === '' ? NaN : Number(s))
const orZero = (s: string) => (s.trim() === '' ? 0 : Number(s))

function lineCalc(l: Line) {
  const qty = toNum(l.quantity)
  const price = toNum(l.unitPrice)
  const disc = orZero(l.discount)
  const gross = Number.isNaN(qty) || Number.isNaN(price) ? 0 : cents(qty * price)
  let error: string | null = null
  if (Number.isNaN(qty) || qty <= 0) error = 'Enter a quantity'
  else if (qty > l.stock) error = `Only ${formatQuantity(l.stock)} ${l.unit} in stock`
  else if (Number.isNaN(price) || price < 0) error = 'Enter a price'
  else if (Number.isNaN(disc) || disc < 0) error = 'Invalid discount'
  else if (disc > gross) error = 'Discount is more than the line amount'
  return { qty, price, disc, gross, total: Math.max(0, cents(gross - (Number.isNaN(disc) ? 0 : disc))), error }
}

export default function SaleForm() {
  const navigate = useNavigate()
  const toast = useToast()
  const createSale = useCreateSale()

  const [lines, setLines] = useState<Line[]>([])
  const [saleDate, setSaleDate] = useState(toISODate(new Date()))
  const [customer, setCustomer] = useState('')
  const [saleDiscount, setSaleDiscount] = useState('')
  const [notes, setNotes] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod | ''>('')
  const [payRef, setPayRef] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const calcs = useMemo(() => lines.map(lineCalc), [lines])
  const subtotal = cents(calcs.reduce((a, c) => a + c.total, 0))
  const lineDiscounts = cents(calcs.reduce((a, c) => a + (Number.isNaN(c.disc) ? 0 : c.disc), 0))
  const saleDisc = orZero(saleDiscount)
  const total = Math.max(0, cents(subtotal - (Number.isNaN(saleDisc) ? 0 : saleDisc)))
  const paid = orZero(payAmount)
  const balance = cents(total - (Number.isNaN(paid) ? 0 : paid))

  // ---------- validation ----------
  const errors: Record<string, string> = {}
  if (lines.length === 0) errors.items = 'Add at least one product'
  if (calcs.some((c) => c.error)) errors.items = 'Fix the highlighted lines'
  if (Number.isNaN(saleDisc) || saleDisc < 0) errors.saleDiscount = 'Invalid discount'
  else if (saleDisc > subtotal) errors.saleDiscount = 'More than the subtotal'
  if (Number.isNaN(paid) || paid < 0) errors.payAmount = 'Invalid amount'
  else if (paid > total) errors.payAmount = 'More than the sale total'
  if (paid > 0 && !payMethod) errors.payMethod = 'Choose how they paid'
  if (balance > 0 && lines.length > 0 && !customer.trim()) errors.customer = 'Needed when the sale is not fully paid, so you know who owes'
  if (saleDate > toISODate(new Date())) errors.saleDate = "Date can't be in the future"
  const shown = submitted ? errors : {}

  // ---------- line editing ----------
  function addProduct(p: Product) {
    setLines((ls) => {
      const existing = ls.find((l) => l.productId === p.id)
      if (existing) {
        return ls.map((l) => (l === existing ? { ...l, quantity: String(orZero(l.quantity) + 1) } : l))
      }
      return [
        ...ls,
        {
          key: Date.now(),
          productId: p.id,
          name: p.name,
          unit: p.unit,
          stock: p.stock_quantity,
          listPrice: p.selling_price,
          quantity: '1',
          unitPrice: String(p.selling_price),
          discount: '',
        },
      ]
    })
  }

  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const removeLine = (key: number) => setLines((ls) => ls.filter((l) => l.key !== key))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setServerError(null)
    if (Object.keys(errors).length) return

    try {
      const sale = await createSale.mutateAsync({
        sale_date: saleDate,
        customer_name: customer.trim() || null,
        items: lines.map((l, i) => ({
          product_id: l.productId,
          quantity: calcs[i].qty,
          unit_price: calcs[i].price,
          discount: calcs[i].disc || 0,
        })),
        discount: saleDisc || 0,
        notes: notes.trim() || null,
        payment: paid > 0 && payMethod ? { amount: paid, method: payMethod, reference: payRef.trim() || null } : null,
      })
      toast.success(`Sale ${sale.reference} recorded — ${formatCurrency(sale.total)}`)
      navigate(`/sales/${sale.id}`, { replace: true })
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Could not record the sale')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const numberProps = { type: 'number', inputMode: 'decimal' as const, min: '0', step: 'any' }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
      {/* ---------- items ---------- */}
      <Card variant="form" title="Items" subtitle="Search and add products. Prices can be changed per line." bodyClassName="flex flex-col gap-4">
        {serverError && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {serverError}
          </p>
        )}

        <ProductPicker onPick={addProduct} addedIds={new Set(lines.map((l) => l.productId))} />

        {lines.length === 0 ? (
          <div className={cn('flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center', shown.items ? 'border-red-300' : 'border-stone-300')}>
            <ShoppingBasket className="size-6 text-ink-300" aria-hidden />
            <p className="text-sm text-ink-500">No items yet — search above to add products.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {lines.map((l, i) => {
              const c = calcs[i]
              const err = submitted ? c.error : c.error?.startsWith('Only') ? c.error : null // stock warnings show live
              return (
                <li key={l.key} className={cn('rounded-xl border p-3', err ? 'border-red-200 bg-red-50/40' : 'border-stone-200')}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{l.name}</p>
                      <p className="tabular text-xs text-ink-400">
                        {formatQuantity(l.stock)} {l.unit} in stock · list price {formatCurrency(l.listPrice)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(l.key)}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-stone-100 hover:text-red-600"
                      aria-label={`Remove ${l.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-[6rem_1fr_1fr_auto] sm:items-end">
                    <label className="text-xs text-ink-500">
                      Qty ({l.unit})
                      <input {...numberProps} aria-label={`Quantity of ${l.name}`} value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} className={cn(inputClass, 'tabular mt-1')} />
                    </label>
                    <label className="text-xs text-ink-500">
                      Unit price
                      <input {...numberProps} aria-label={`Unit price of ${l.name}`} value={l.unitPrice} onChange={(e) => setLine(l.key, { unitPrice: e.target.value })} className={cn(inputClass, 'tabular mt-1', Number(l.unitPrice) !== l.listPrice && 'border-brand-400 bg-brand-50/40')} />
                    </label>
                    <label className="text-xs text-ink-500">
                      Discount
                      <input {...numberProps} aria-label={`Discount on ${l.name}`} placeholder="0" value={l.discount} onChange={(e) => setLine(l.key, { discount: e.target.value })} className={cn(inputClass, 'tabular mt-1')} />
                    </label>
                    <div className="col-span-3 flex items-baseline justify-between sm:col-span-1 sm:block sm:min-w-28 sm:text-right">
                      <span className="text-xs text-ink-500 sm:block">Line total</span>
                      <span className="tabular text-sm font-semibold text-ink-900 sm:mt-2.5 sm:block">{formatCurrency(c.total)}</span>
                    </div>
                  </div>
                  {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
                </li>
              )
            })}
          </ul>
        )}
        {shown.items && lines.length === 0 && <p className="text-xs text-red-600">{shown.items}</p>}
      </Card>

      {/* ---------- summary & payment ---------- */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-20">
        <Card variant="form" title="Sale details" bodyClassName="flex flex-col gap-4">
          <Field label="Date" error={shown.saleDate}>
            {(id, d) => <Input id={id} aria-describedby={d} type="date" max={toISODate(new Date())} value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />}
          </Field>
          <Field label="Customer name" error={shown.customer} hint={balance > 0 && lines.length ? 'Required — the sale is not fully paid' : 'Optional for paid sales'}>
            {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!shown.customer} value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. Aminata Kamara" />}
          </Field>
          <Field label="Discount on whole sale" error={shown.saleDiscount}>
            {(id, d) => <PrefixedInput prefix={CURRENCY} id={id} aria-describedby={d} {...numberProps} placeholder="0" value={saleDiscount} onChange={(e) => setSaleDiscount(e.target.value)} />}
          </Field>
        </Card>

        <Card variant="form" title="Payment" subtitle="Leave the amount empty for a credit sale." bodyClassName="flex flex-col gap-4">
          <Field label="Amount paid now" error={shown.payAmount}>
            {(id, d) => <PrefixedInput prefix={CURRENCY} id={id} aria-describedby={d} aria-invalid={!!shown.payAmount} {...numberProps} placeholder="0.00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />}
          </Field>
          <div className="-mt-2 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPayAmount(total ? String(total) : '')} disabled={!total}>
              Paid in full
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPayAmount('')}>
              On credit
            </Button>
          </div>
          <Field label="Paid by" error={shown.payMethod}>
            {(id, d) => (
              <Select id={id} aria-describedby={d} aria-invalid={!!shown.payMethod} value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod | '')}>
                <option value="">Choose…</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {payMethod && payMethod !== 'cash' && (
            <Field label="Transaction reference" hint="e.g. Orange Money / Afrimoney ID">
              {(id, d) => <Input id={id} aria-describedby={d} value={payRef} onChange={(e) => setPayRef(e.target.value)} />}
            </Field>
          )}
        </Card>

        <Card bodyClassName="flex flex-col gap-3">
          <dl className="tabular flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-ink-600">
              <dt>Subtotal</dt>
              <dd>{formatCurrency(subtotal)}</dd>
            </div>
            {lineDiscounts + (saleDisc || 0) > 0 && (
              <div className="flex justify-between text-ink-500">
                <dt>Discounts</dt>
                <dd>−{formatCurrency(cents(lineDiscounts + (saleDisc || 0)))}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-stone-100 pt-2 text-base font-semibold text-ink-900">
              <dt>Total</dt>
              <dd>{formatCurrency(total)}</dd>
            </div>
            <div className="flex justify-between text-ink-600">
              <dt>Paid now</dt>
              <dd>{formatCurrency(Number.isNaN(paid) ? 0 : paid)}</dd>
            </div>
            <div className={cn('flex justify-between font-medium', balance > 0 ? 'text-orange-700' : 'text-emerald-700')}>
              <dt>{balance > 0 ? 'Balance owed' : 'Balance'}</dt>
              <dd>{formatCurrency(Math.max(balance, 0))}</dd>
            </div>
          </dl>
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-ink-500 hover:text-ink-700">Add a note</summary>
            <Textarea className="mt-2" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
          </details>
          {submitted && Object.keys(errors).length > 0 && (
            <p className="text-xs text-red-600">Please fix the highlighted fields.</p>
          )}
          <Button type="submit" loading={createSale.isPending} className="w-full">
            Record sale
          </Button>
        </Card>
      </div>
    </form>
  )
}
