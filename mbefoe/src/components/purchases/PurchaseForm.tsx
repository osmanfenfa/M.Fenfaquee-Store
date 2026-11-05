import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, PackagePlus, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import ProductPicker from '@/components/sales/ProductPicker'
import SupplierForm from '@/components/suppliers/SupplierForm'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Field, Input, PrefixedInput, Select, Textarea, inputClass } from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/context/ToastContext'
import { useCreatePurchase, useSupplierOptions } from '@/hooks/usePurchases'
import { CURRENCY, formatCurrency, formatQuantity } from '@/lib/formatCurrency'
import { toISODate } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import type { Product } from '@/types/product'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from '@/types/sales'

interface Line {
  key: number
  productId: number
  name: string
  unit: string
  stock: number
  currentCost: number
  currentPrice: number
  quantity: string
  unitCost: string
  newPrice: string
}

const cents = (n: number) => Math.round(n * 100) / 100
const toNum = (s: string) => (s.trim() === '' ? NaN : Number(s))

function lineCalc(l: Line) {
  const qty = toNum(l.quantity)
  const cost = toNum(l.unitCost)
  const newPrice = l.newPrice.trim() === '' ? null : Number(l.newPrice)
  let error: string | null = null
  if (Number.isNaN(qty) || qty <= 0) error = 'Enter a quantity'
  else if (Number.isNaN(cost) || cost < 0) error = 'Enter the cost per unit'
  else if (newPrice !== null && (Number.isNaN(newPrice) || newPrice < 0)) error = 'Invalid selling price'
  const sellAt = newPrice ?? l.currentPrice
  const belowCost = !error && sellAt < cost
  return { qty, cost, newPrice, total: error ? 0 : cents(qty * cost), error, belowCost, sellAt }
}

export default function PurchaseForm() {
  const navigate = useNavigate()
  const toast = useToast()
  const create = useCreatePurchase()
  const { data: suppliers = [] } = useSupplierOptions()

  const [lines, setLines] = useState<Line[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [received, setReceived] = useState(true)
  const [notes, setNotes] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod | ''>('')
  const [payRef, setPayRef] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [newSupplierOpen, setNewSupplierOpen] = useState(false)

  const calcs = useMemo(() => lines.map(lineCalc), [lines])
  const total = cents(calcs.reduce((a, c) => a + c.total, 0))
  const paid = payAmount.trim() === '' ? 0 : Number(payAmount)
  const balance = cents(total - (Number.isNaN(paid) ? 0 : paid))

  const errors: Record<string, string> = {}
  if (lines.length === 0) errors.items = 'Add at least one product'
  if (calcs.some((c) => c.error)) errors.items = 'Fix the highlighted lines'
  if (Number.isNaN(paid) || paid < 0) errors.payAmount = 'Invalid amount'
  else if (paid > total) errors.payAmount = 'More than the purchase total'
  if (paid > 0 && !payMethod) errors.payMethod = 'Choose how you paid'
  if (balance > 0 && lines.length > 0 && !supplierId) errors.supplier = 'Choose the supplier so you can track what you owe'
  if (date > toISODate(new Date())) errors.date = "Date can't be in the future"
  const shown = submitted ? errors : {}

  function addProduct(p: Product) {
    setLines((ls) => {
      const existing = ls.find((l) => l.productId === p.id)
      if (existing) return ls.map((l) => (l === existing ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l))
      return [
        ...ls,
        {
          key: Date.now(),
          productId: p.id,
          name: p.name,
          unit: p.unit,
          stock: p.stock_quantity,
          currentCost: p.cost_price,
          currentPrice: p.selling_price,
          quantity: '1',
          unitCost: String(p.cost_price),
          newPrice: '',
        },
      ]
    })
  }
  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setServerError(null)
    if (Object.keys(errors).length) return
    try {
      const purchase = await create.mutateAsync({
        supplier_id: supplierId ? Number(supplierId) : null,
        supplier_invoice_no: invoiceNo.trim() || null,
        purchase_date: date,
        status: received ? 'received' : 'ordered',
        items: lines.map((l, i) => ({
          product_id: l.productId,
          quantity: calcs[i].qty,
          unit_cost: calcs[i].cost,
          new_selling_price: calcs[i].newPrice,
        })),
        notes: notes.trim() || null,
        payment: paid > 0 && payMethod ? { amount: paid, method: payMethod, reference: payRef.trim() || null } : null,
      })
      toast.success(`${purchase.reference} recorded${received ? ' — stock added' : ''}`)
      navigate(`/purchases/${purchase.id}`, { replace: true })
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Could not record the purchase')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const numberProps = { type: 'number', inputMode: 'decimal' as const, min: '0', step: 'any' }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
        <Card variant="form" title="Items bought" subtitle="Search products and enter what you paid per unit." bodyClassName="flex flex-col gap-4">
          {serverError && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {serverError}
            </p>
          )}
          <ProductPicker onPick={addProduct} requireStock={false} addedIds={new Set(lines.map((l) => l.productId))} />

          {lines.length === 0 ? (
            <div className={cn('flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center', shown.items ? 'border-red-300' : 'border-stone-300')}>
              <PackagePlus className="size-6 text-ink-300" aria-hidden />
              <p className="text-sm text-ink-500">No items yet — search above. New product? Add it on the Products page first.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {lines.map((l, i) => {
                const c = calcs[i]
                const err = submitted ? c.error : null
                return (
                  <li key={l.key} className={cn('rounded-xl border p-3', err ? 'border-red-200 bg-red-50/40' : 'border-stone-200')}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900">{l.name}</p>
                        <p className="tabular text-xs text-ink-400">
                          {formatQuantity(l.stock)} {l.unit} in stock · avg cost {formatCurrency(l.currentCost)} · sells at {formatCurrency(l.currentPrice)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-stone-100 hover:text-red-600"
                        aria-label={`Remove ${l.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-[6rem_1fr_1fr_auto] sm:items-end">
                      <label className="text-xs text-ink-500">
                        Qty ({l.unit})
                        <input {...numberProps} value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} className={cn(inputClass, 'tabular mt-1')} />
                      </label>
                      <label className="text-xs text-ink-500">
                        Cost / unit
                        <input {...numberProps} value={l.unitCost} onChange={(e) => setLine(l.key, { unitCost: e.target.value })} className={cn(inputClass, 'tabular mt-1')} />
                      </label>
                      <label className="text-xs text-ink-500">
                        New selling price
                        <input {...numberProps} placeholder={String(l.currentPrice)} value={l.newPrice} onChange={(e) => setLine(l.key, { newPrice: e.target.value })} className={cn(inputClass, 'tabular mt-1')} />
                      </label>
                      <div className="col-span-3 flex items-baseline justify-between sm:col-span-1 sm:block sm:min-w-28 sm:text-right">
                        <span className="text-xs text-ink-500 sm:block">Line total</span>
                        <span className="tabular text-sm font-semibold text-ink-900 sm:mt-2.5 sm:block">{formatCurrency(c.total)}</span>
                      </div>
                    </div>
                    {err ? (
                      <p className="mt-2 text-xs text-red-600">{err}</p>
                    ) : c.belowCost ? (
                      <p className="mt-2 flex items-center gap-1 text-xs text-orange-700">
                        <AlertTriangle className="size-3.5" aria-hidden /> Selling price {formatCurrency(c.sellAt)} is below this cost — consider a new selling price.
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
          <Card variant="form" title="Purchase details" bodyClassName="flex flex-col gap-4">
            <Field label="Supplier" error={shown.supplier} hint={!shown.supplier ? 'Optional for fully paid market purchases' : undefined}>
              {(id, d) => (
                <div className="flex gap-2">
                  <Select id={id} aria-describedby={d} aria-invalid={!!shown.supplier} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="flex-1">
                    <option value="">No supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  <Button variant="secondary" onClick={() => setNewSupplierOpen(true)} aria-label="Add new supplier" title="Add new supplier">
                    <Plus className="size-4" />
                  </Button>
                </div>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" error={shown.date}>
                {(id) => <Input id={id} type="date" max={toISODate(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />}
              </Field>
              <Field label="Invoice no.">{(id) => <Input id={id} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Optional" />}</Field>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink-700">Goods</legend>
              <div className="flex rounded-full border border-stone-300 bg-white p-0.5 text-xs font-medium">
                {[
                  [true, 'Received now'],
                  [false, 'Ordered, not yet here'],
                ].map(([val, label]) => (
                  <button
                    key={String(val)}
                    type="button"
                    aria-pressed={received === val}
                    onClick={() => setReceived(val as boolean)}
                    className={cn('flex-1 rounded-full px-2 py-1.5', received === val ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-stone-100')}
                  >
                    {label as string}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-ink-500">
                {received ? 'Stock is added and average cost updated immediately.' : 'Stock is added later when you mark it received.'}
              </p>
            </fieldset>
          </Card>

          <Card variant="form" title="Payment to supplier" subtitle="Leave empty if you'll pay later." bodyClassName="flex flex-col gap-4">
            <Field label="Amount paid now" error={shown.payAmount}>
              {(id, d) => <PrefixedInput prefix={CURRENCY} id={id} aria-describedby={d} {...numberProps} placeholder="0.00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />}
            </Field>
            <div className="-mt-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPayAmount(total ? String(total) : '')} disabled={!total}>
                Paid in full
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPayAmount('')}>
                Pay later
              </Button>
            </div>
            <Field label="Paid by" error={shown.payMethod}>
              {(id) => (
                <Select id={id} value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod | '')}>
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
              <Field label="Transaction reference">{(id) => <Input id={id} value={payRef} onChange={(e) => setPayRef(e.target.value)} />}</Field>
            )}
          </Card>

          <Card bodyClassName="flex flex-col gap-3">
            <dl className="tabular flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between text-base font-semibold text-ink-900">
                <dt>Total</dt>
                <dd>{formatCurrency(total)}</dd>
              </div>
              <div className="flex justify-between text-ink-600">
                <dt>Paid now</dt>
                <dd>{formatCurrency(Number.isNaN(paid) ? 0 : paid)}</dd>
              </div>
              <div className={cn('flex justify-between font-medium', balance > 0 ? 'text-orange-700' : 'text-emerald-700')}>
                <dt>{balance > 0 ? 'You will owe' : 'Balance'}</dt>
                <dd>{formatCurrency(Math.max(balance, 0))}</dd>
              </div>
            </dl>
            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-ink-500 hover:text-ink-700">Add a note</summary>
              <Textarea className="mt-2" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
            </details>
            {submitted && Object.keys(errors).length > 0 && <p className="text-xs text-red-600">Please fix the highlighted fields.</p>}
            <Button type="submit" loading={create.isPending} className="w-full">
              Record purchase
            </Button>
          </Card>
        </div>
      </form>

      <Modal open={newSupplierOpen} onClose={() => setNewSupplierOpen(false)} title="Add supplier">
        {newSupplierOpen && (
          <SupplierForm supplier={null} onClose={() => setNewSupplierOpen(false)} onSaved={(s) => setSupplierId(String(s.id))} />
        )}
      </Modal>
    </>
  )
}
