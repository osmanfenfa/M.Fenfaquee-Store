import { useState, type FormEvent } from 'react'
import { Ban, HandCoins, PackageCheck } from 'lucide-react'
import { Link } from 'react-router'
import PaymentForm from '@/components/payments/PaymentForm'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/context/ToastContext'
import { useAddPurchasePayment, useCancelPurchase } from '@/hooks/usePurchases'
import { formatCurrency, formatQuantity } from '@/lib/formatCurrency'
import { formatDate } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import type { PurchaseDetail } from '@/types/purchase'
import { PAYMENT_METHOD_LABELS } from '@/types/sales'
import PurchaseStatusBadge from './PurchaseStatusBadge'
import ReceiveStockForm from './ReceiveStockForm'

function CancelForm({ purchase, onDone }: { purchase: PurchaseDetail; onDone: () => void }) {
  const toast = useToast()
  const cancel = useCancelPurchase()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (reason.trim().length < 3) return setError('Give a short reason')
    try {
      await cancel.mutateAsync({ id: purchase.id, reason: reason.trim() })
      toast.success(`${purchase.reference} cancelled`)
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel the purchase')
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="text-sm text-ink-600">
        {purchase.status === 'received' ? (
          <p>
            The stock this purchase added will be removed again. This is blocked if some of it has already been sold — in that case,
            correct stock with an inventory adjustment instead.
          </p>
        ) : (
          <p>The order will be marked cancelled. No stock is affected.</p>
        )}
        {purchase.amount_paid > 0 && (
          <p className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-orange-900">
            You paid {formatCurrency(purchase.amount_paid)} on this purchase — arrange a refund with the supplier.
          </p>
        )}
      </div>
      <Field label="Reason" required error={error ?? undefined}>
        {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!error} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus placeholder="e.g. Entered wrong quantities" />}
      </Field>
      <div className="-mx-5 -mb-4 flex justify-center gap-2 border-t border-stone-100 px-5 py-3 sm:justify-end">
        <Button variant="secondary" onClick={onDone} disabled={cancel.isPending}>
          Keep purchase
        </Button>
        <Button type="submit" variant="danger" loading={cancel.isPending}>
          Cancel purchase
        </Button>
      </div>
    </form>
  )
}

export default function PurchaseDetails({ purchase }: { purchase: PurchaseDetail }) {
  const toast = useToast()
  const addPayment = useAddPurchasePayment()
  const [modal, setModal] = useState<'pay' | 'receive' | 'cancel' | null>(null)
  const close = () => setModal(null)
  const cancelled = purchase.status === 'cancelled'

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{purchase.reference}</h1>
            <PurchaseStatusBadge status={purchase.status} paymentStatus={purchase.payment_status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {formatDate(purchase.purchase_date)} ·{' '}
            {purchase.supplier_id ? (
              <Link to={`/purchases?supplier=${purchase.supplier_id}`} className="hover:text-brand-700">
                {purchase.supplier_name}
              </Link>
            ) : (
              'No supplier'
            )}
            {purchase.supplier_invoice_no && ` · Invoice ${purchase.supplier_invoice_no}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!cancelled && (
            <Button variant="ghost" onClick={() => setModal('cancel')}>
              <Ban className="size-4" /> Cancel
            </Button>
          )}
          {purchase.status === 'ordered' && (
            <Button variant="secondary" onClick={() => setModal('receive')}>
              <PackageCheck className="size-4" /> Mark received
            </Button>
          )}
          {!cancelled && purchase.balance_due > 0 && (
            <Button onClick={() => setModal('pay')}>
              <HandCoins className="size-4" /> Pay supplier
            </Button>
          )}
        </div>
      </div>

      {cancelled && (
        <p className="mb-4 rounded-xl border border-stone-200 bg-stone-100 px-4 py-3 text-sm text-ink-700">
          Cancelled{purchase.cancel_reason ? `: “${purchase.cancel_reason}”` : ''}.
        </p>
      )}
      {purchase.status === 'ordered' && (
        <p className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Awaiting delivery — stock will be added when you mark it received.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <Card title="Items" bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs text-ink-500">
                <th className="px-5 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Cost / unit</th>
                <th className="px-5 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-stone-100">
              {purchase.items.map((i) => (
                <tr key={i.id}>
                  <td className="px-5 py-3">
                    <p className="text-ink-900">{i.product_name}</p>
                    <p className="text-xs text-ink-400 sm:hidden">@ {formatCurrency(i.unit_cost)}</p>
                  </td>
                  <td className="px-3 py-3 text-right text-ink-700">
                    {formatQuantity(i.quantity)} <span className="text-ink-400">{i.product_unit}</span>
                  </td>
                  <td className="hidden px-3 py-3 text-right text-ink-700 sm:table-cell">{formatCurrency(i.unit_cost)}</td>
                  <td className="px-5 py-3 text-right font-medium text-ink-900">{formatCurrency(i.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {purchase.notes && <p className="border-t border-stone-100 px-5 py-3 text-sm text-ink-600">Note: {purchase.notes}</p>}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <dl className="tabular flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between text-base font-semibold text-ink-900">
                <dt>Total</dt>
                <dd>{formatCurrency(purchase.total)}</dd>
              </div>
              <div className="flex justify-between text-ink-600">
                <dt>Paid</dt>
                <dd>{formatCurrency(purchase.amount_paid)}</dd>
              </div>
              {!cancelled && (
                <div className={cn('flex justify-between font-medium', purchase.balance_due > 0 ? 'text-orange-700' : 'text-emerald-700')}>
                  <dt>You owe</dt>
                  <dd>{formatCurrency(purchase.balance_due)}</dd>
                </div>
              )}
            </dl>
          </Card>
          <Card title="Payments to supplier">
            {purchase.payments.length === 0 ? (
              <p className="text-sm text-ink-400">No payments yet.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {purchase.payments.map((p) => (
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

      <Modal open={modal === 'pay'} onClose={close} title="Pay supplier" description={purchase.supplier_name ?? undefined}>
        {modal === 'pay' && (
          <PaymentForm
            balance={purchase.balance_due}
            minDate={purchase.purchase_date}
            balanceLabel="You owe"
            submitLabel="Record payment"
            onCancel={close}
            onSubmit={async (data) => {
              await addPayment.mutateAsync({ id: purchase.id, data })
              toast.success(`${formatCurrency(data.amount)} paid to ${purchase.supplier_name ?? 'supplier'}`)
              close()
            }}
          />
        )}
      </Modal>
      <Modal open={modal === 'receive'} onClose={close} title="Receive goods" size="md">
        {modal === 'receive' && <ReceiveStockForm purchase={purchase} onDone={close} />}
      </Modal>
      <Modal open={modal === 'cancel'} onClose={close} title={`Cancel ${purchase.reference}?`} size="sm">
        {modal === 'cancel' && <CancelForm purchase={purchase} onDone={close} />}
      </Modal>
    </>
  )
}
