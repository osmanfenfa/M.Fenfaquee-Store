import { useState, type FormEvent } from 'react'
import { ArrowRight, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/context/ToastContext'
import { useAdjustStock } from '@/hooks/useInventory'
import { formatQuantity } from '@/lib/formatCurrency'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import type { StockMovement } from '@/types/inventory'
import type { Product } from '@/types/product'

const REASONS = {
  count: ['Shelf count', 'Weekly count', 'Month-end count'],
  change: ['Damaged', 'Expired', 'Lost / stolen', 'Used in shop', 'Found extra', 'Returned by customer'],
}

interface Props {
  product: Product
  onDone: (m: StockMovement) => void
  onCancel: () => void
}

/**
 * Correct one product's stock. "I counted" is the usual case: enter what's on
 * the shelf and the difference is recorded. "Add / remove" is for damage, expiry, etc.
 */
export default function StockAdjustmentForm({ product, onDone, onCancel }: Props) {
  const toast = useToast()
  const adjust = useAdjustStock()
  const [mode, setMode] = useState<'count' | 'change'>('count')
  const [direction, setDirection] = useState<'remove' | 'add'>('remove')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const n = qty.trim() === '' ? NaN : Number(qty)
  const newStock = Number.isNaN(n) ? null : mode === 'count' ? n : direction === 'add' ? product.stock_quantity + n : product.stock_quantity - n
  const diff = newStock === null ? null : newStock - product.stock_quantity

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (Number.isNaN(n) || n < 0 || (mode === 'change' && n === 0)) return setError('Enter a valid quantity')
    if (newStock !== null && newStock < 0) return setError(`Only ${formatQuantity(product.stock_quantity)} ${product.unit} in stock`)
    if (diff === 0) return setError('That matches the recorded stock — nothing to change')
    if (reason.trim().length < 3) return setError('Choose or type a reason')
    try {
      const m = await adjust.mutateAsync({
        product_id: product.id,
        reason: reason.trim(),
        ...(mode === 'count' ? { counted_quantity: n } : { quantity_change: direction === 'add' ? n : -n }),
      })
      toast.success(`${product.name}: stock now ${formatQuantity(m.quantity_after)} ${product.unit}`)
      onDone(m)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not adjust stock')
    }
  }

  const tab = (active: boolean) => cn('flex-1 rounded-full px-3 py-1.5', active ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-stone-100')

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink-900">{product.name}</p>
          <p className="tabular text-sm text-ink-500">
            Recorded stock: <span className="font-semibold text-ink-800">{formatQuantity(product.stock_quantity)} {product.unit}</span>
          </p>
        </div>
        <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-ink-400 hover:bg-white hover:text-ink-700" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      <div className="mb-4 flex rounded-full border border-stone-300 bg-white p-0.5 text-xs font-medium">
        <button type="button" aria-pressed={mode === 'count'} onClick={() => setMode('count')} className={tab(mode === 'count')}>
          I counted
        </button>
        <button type="button" aria-pressed={mode === 'change'} onClick={() => setMode('change')} className={tab(mode === 'change')}>
          Add / remove
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {mode === 'change' && (
          <div className="flex rounded-full border border-stone-300 bg-white p-0.5 text-xs font-medium sm:col-span-2">
            <button type="button" aria-pressed={direction === 'remove'} onClick={() => setDirection('remove')} className={tab(direction === 'remove')}>
              Remove from stock
            </button>
            <button type="button" aria-pressed={direction === 'add'} onClick={() => setDirection('add')} className={tab(direction === 'add')}>
              Add to stock
            </button>
          </div>
        )}
        <Field label={mode === 'count' ? `Quantity on the shelf (${product.unit})` : `Quantity (${product.unit})`}>
          {(id) => <Input id={id} type="number" inputMode="decimal" min="0" step="any" className="tabular" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />}
        </Field>
        <div className="flex items-end">
          {newStock !== null && diff !== null && (
            <p className="tabular flex items-center gap-2 pb-2 text-sm text-ink-600">
              {formatQuantity(product.stock_quantity)} <ArrowRight className="size-3.5" aria-hidden />
              <span className={cn('font-semibold', newStock < 0 ? 'text-red-700' : 'text-ink-900')}>{formatQuantity(newStock)}</span>
              {diff !== 0 && <span className={diff > 0 ? 'text-emerald-700' : 'text-orange-700'}>({diff > 0 ? '+' : '−'}{formatQuantity(Math.abs(diff))})</span>}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Field label="Reason">
          {(id) => (
            <>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {REASONS[mode].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={cn('rounded-full border px-2.5 py-1 text-xs', reason === r ? 'border-brand-500 bg-brand-100 text-brand-900' : 'border-stone-300 bg-white text-ink-600 hover:bg-stone-50')}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Or type a reason" />
            </>
          )}
        </Field>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={adjust.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={adjust.isPending}>
          Save adjustment
        </Button>
      </div>
    </form>
  )
}
