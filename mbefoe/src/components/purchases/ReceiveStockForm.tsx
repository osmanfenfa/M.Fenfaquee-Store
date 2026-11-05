import Button from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { useReceivePurchase } from '@/hooks/usePurchases'
import { formatCurrency, formatQuantity } from '@/lib/formatCurrency'
import { ApiError } from '@/services/api'
import type { PurchaseDetail } from '@/types/purchase'

/** Confirm that ordered goods have arrived — adds the stock. */
export default function ReceiveStockForm({ purchase, onDone }: { purchase: PurchaseDetail; onDone: () => void }) {
  const toast = useToast()
  const receive = useReceivePurchase()

  async function confirm() {
    try {
      await receive.mutateAsync(purchase.id)
      toast.success(`${purchase.reference} received — stock added`)
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not receive the purchase')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-600">These quantities will be added to stock, and each product's average cost updated:</p>
      <ul className="tabular divide-y divide-stone-100 rounded-xl border border-stone-200 text-sm">
        {purchase.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3 px-3 py-2">
            <span className="text-ink-800">{i.product_name}</span>
            <span className="text-ink-600">
              +{formatQuantity(i.quantity)} {i.product_unit} @ {formatCurrency(i.unit_cost)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-500">If something arrived short or different, cancel this purchase and record what actually arrived.</p>
      <div className="-mx-5 -mb-4 flex justify-center gap-2 border-t border-stone-100 px-5 py-3 sm:justify-end">
        <Button variant="secondary" onClick={onDone} disabled={receive.isPending}>
          Not yet
        </Button>
        <Button onClick={confirm} loading={receive.isPending}>
          Goods received
        </Button>
      </div>
    </div>
  )
}
