import { useState, type FormEvent } from 'react'
import { Ban, HandCoins, Printer } from 'lucide-react'
import { Link } from 'react-router'
import Button, { buttonStyles } from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import PaymentForm from '@/components/payments/PaymentForm'
import { Field, Input } from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/context/ToastContext'
import { useAddSalePayment, useVoidSale } from '@/hooks/useSales'
import { formatCurrency, formatQuantity } from '@/lib/formatCurrency'
import { formatDate } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { PAYMENT_METHOD_LABELS, type SaleDetail } from '@/types/sales'
import SaleStatusBadge from './SaleStatusBadge'

function SalePaymentForm({ sale, onDone }: { sale: SaleDetail; onDone: () => void }) {
  const toast = useToast()
  const addPayment = useAddSalePayment()
  return (
    <PaymentForm
      balance={sale.balance_due}
      minDate={sale.sale_date}
      balanceLabel="Balance owed"
      submitLabel="Record payment"
      onCancel={onDone}
      onSubmit={async (data) => {
        await addPayment.mutateAsync({ id: sale.id, data })
        toast.success(`${formatCurrency(data.amount)} received from ${sale.customer_name ?? 'customer'}`)
        onDone()
      }}
    />
  )
}

function VoidForm({ sale, onDone }: { sale: SaleDetail; onDone: () => void }) {
  const toast = useToast()
  const voidSale = useVoidSale()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (reason.trim().length < 3) return setError('Give a short reason, e.g. "Wrong quantity"')
    try {
      await voidSale.mutateAsync({ id: sale.id, reason: reason.trim() })
      toast.success(`${sale.reference} voided — stock returned`)
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not void the sale')
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="text-sm text-ink-600">
        <p>Voiding this sale will:</p>
        <ul className="mt-1 list-disc pl-5">
          <li>return {sale.items.length === 1 ? 'the item' : `all ${sale.items.length} items`} to stock</li>
          <li>remove it from sales and profit figures</li>
          <li>keep it in history, marked as voided</li>
        </ul>
        {sale.amount_paid > 0 && (
          <p className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-orange-900">
            {formatCurrency(sale.amount_paid)} was paid on this sale. Refund the customer if needed.
          </p>
        )}
        <p className="mt-2">If the sale was entered wrongly, record it again correctly afterwards.</p>
      </div>
      <Field label="Reason" required error={error ?? undefined}>
        {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!error} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus placeholder="e.g. Wrong quantity entered" />}
      </Field>
      <div className="-mx-5 -mb-4 flex justify-center gap-2 border-t border-stone-100 px-5 py-3 sm:justify-end">
        <Button variant="secondary" onClick={onDone} disabled={voidSale.isPending}>
          Keep sale
        </Button>
        <Button type="submit" variant="danger" loading={voidSale.isPending}>
          Void sale
        </Button>
      </div>
    </form>
  )
}

export default function SaleDetails({ sale }: { sale: SaleDetail }) {
  const [paying, setPaying] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const voided = sale.status === 'voided'
  const canPay = !voided && sale.balance_due > 0

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{sale.reference}</h1>
            <SaleStatusBadge status={sale.status} paymentStatus={sale.payment_status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {formatDate(sale.sale_date)} · {sale.customer_name ?? 'Walk-in customer'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!voided && (
            <Button variant="ghost" onClick={() => setVoiding(true)}>
              <Ban className="size-4" /> Void
            </Button>
          )}
          <Link to={`/sales/${sale.id}/receipt`} target="_blank" className={buttonStyles('secondary')}>
            <Printer className="size-4" /> Receipt
          </Link>
          {canPay && (
            <Button onClick={() => setPaying(true)}>
              <HandCoins className="size-4" /> Record payment
            </Button>
          )}
        </div>
      </div>

      {voided && (
        <p className="mb-4 rounded-xl border border-stone-200 bg-stone-100 px-4 py-3 text-sm text-ink-700">
          This sale was voided{sale.void_reason ? `: “${sale.void_reason}”` : ''}. Its stock was returned and it is excluded from reports.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <Card title="Items" bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs text-ink-500">
                <th className="px-5 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Price</th>
                <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Discount</th>
                <th className="px-5 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-stone-100">
              {sale.items.map((i) => (
                <tr key={i.id}>
                  <td className="px-5 py-3">
                    <p className="text-ink-900">{i.product_name}</p>
                    <p className="text-xs text-ink-400 sm:hidden">
                      @ {formatCurrency(i.unit_price)}
                      {i.discount > 0 && ` − ${formatCurrency(i.discount)}`}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right text-ink-700">
                    {formatQuantity(i.quantity)} <span className="text-ink-400">{i.product_unit}</span>
                  </td>
                  <td className="hidden px-3 py-3 text-right text-ink-700 sm:table-cell">{formatCurrency(i.unit_price)}</td>
                  <td className="hidden px-3 py-3 text-right text-ink-500 sm:table-cell">{i.discount > 0 ? `−${formatCurrency(i.discount)}` : '—'}</td>
                  <td className="px-5 py-3 text-right font-medium text-ink-900">{formatCurrency(i.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sale.notes && <p className="border-t border-stone-100 px-5 py-3 text-sm text-ink-600">Note: {sale.notes}</p>}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <dl className="tabular flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between text-ink-600">
                <dt>Subtotal</dt>
                <dd>{formatCurrency(sale.subtotal)}</dd>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-ink-500">
                  <dt>Sale discount</dt>
                  <dd>−{formatCurrency(sale.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-stone-100 pt-2 text-base font-semibold text-ink-900">
                <dt>Total</dt>
                <dd>{formatCurrency(sale.total)}</dd>
              </div>
              <div className="flex justify-between text-ink-600">
                <dt>Paid</dt>
                <dd>{formatCurrency(sale.amount_paid)}</dd>
              </div>
              {!voided && (
                <div className={cn('flex justify-between font-medium', sale.balance_due > 0 ? 'text-orange-700' : 'text-emerald-700')}>
                  <dt>Balance</dt>
                  <dd>{formatCurrency(sale.balance_due)}</dd>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-stone-100 pt-2 text-xs text-ink-500">
                <dt>Gross profit</dt>
                <dd>{formatCurrency(sale.gross_profit)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Payments">
            {sale.payments.length === 0 ? (
              <p className="text-sm text-ink-400">No payments yet.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {sale.payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm text-ink-800">{PAYMENT_METHOD_LABELS[p.method]}</p>
                      <p className="text-xs text-ink-400">
                        {formatDate(p.payment_date)}
                        {p.reference && ` · ${p.reference}`}
                      </p>
                    </div>
                    <p className="tabular text-sm font-medium text-ink-900">{formatCurrency(p.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal open={paying} onClose={() => setPaying(false)} title="Record payment" description={sale.customer_name ?? undefined}>
        {paying && <SalePaymentForm sale={sale} onDone={() => setPaying(false)} />}
      </Modal>
      <Modal open={voiding} onClose={() => setVoiding(false)} title={`Void ${sale.reference}?`} size="sm">
        {voiding && <VoidForm sale={sale} onDone={() => setVoiding(false)} />}
      </Modal>
    </>
  )
}
