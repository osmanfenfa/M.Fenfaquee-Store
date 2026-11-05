import { useState, type FormEvent } from 'react'
import { Info } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Field, Input, PrefixedInput, Select, Textarea } from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/context/ToastContext'
import { useCategories, useCreateProduct, useUpdateProduct } from '@/hooks/useProducts'
import { CURRENCY, formatCurrency } from '@/lib/formatCurrency'
import { ApiError } from '@/services/api'
import { UNIT_SUGGESTIONS, type Product } from '@/types/product'

interface Props {
  open: boolean
  onClose: () => void
  /** Edit this product; omit to add a new one */
  product?: Product | null
  onSaved?: (p: Product) => void
}

interface FormState {
  name: string
  sku: string
  category_id: string
  unit: string
  cost_price: string
  selling_price: string
  reorder_level: string
  opening_stock: string
  description: string
}

function initialState(p?: Product | null): FormState {
  return {
    name: p?.name ?? '',
    sku: p?.sku ?? '',
    category_id: p?.category_id ? String(p.category_id) : '',
    unit: p?.unit ?? 'piece',
    cost_price: p ? String(p.cost_price) : '',
    selling_price: p ? String(p.selling_price) : '',
    reorder_level: p ? String(p.reorder_level) : '0',
    opening_stock: '0',
    description: p?.description ?? '',
  }
}

const num = (s: string) => (s.trim() === '' ? NaN : Number(s))

function validate(f: FormState, isEdit: boolean): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {}
  if (!f.name.trim()) e.name = 'Enter a product name'
  if (!f.unit.trim()) e.unit = 'Enter a unit, e.g. piece'
  for (const k of ['cost_price', 'selling_price', 'reorder_level'] as const) {
    const v = num(f[k])
    if (Number.isNaN(v) || v < 0) e[k] = 'Enter 0 or more'
  }
  if (!isEdit) {
    const v = num(f.opening_stock)
    if (Number.isNaN(v) || v < 0) e.opening_stock = 'Enter 0 or more'
  }
  return e
}

/** Inner form is keyed by product so state resets cleanly when switching products. */
function ProductFormBody({ product, onClose, onSaved }: Omit<Props, 'open'>) {
  const isEdit = !!product
  const toast = useToast()
  const { data: categories = [] } = useCategories()
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const [form, setForm] = useState<FormState>(() => initialState(product))
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const errors = touched ? validate(form, isEdit) : {}
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const cost = num(form.cost_price)
  const price = num(form.selling_price)
  const showMargin = !Number.isNaN(cost) && !Number.isNaN(price) && price > 0
  const profit = price - cost

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    setServerError(null)
    if (Object.keys(validate(form, isEdit)).length) return

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      description: form.description.trim() || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      unit: form.unit.trim(),
      cost_price: num(form.cost_price),
      selling_price: num(form.selling_price),
      reorder_level: num(form.reorder_level),
    }
    try {
      const saved = isEdit
        ? await update.mutateAsync({ id: product!.id, data: payload })
        : await create.mutateAsync({ ...payload, opening_stock: num(form.opening_stock) })
      toast.success(isEdit ? `Saved changes to ${saved.name}` : `${saved.name} added`)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Could not save the product')
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <Field label="Product name" required error={errors.name}>
        {(id, d) => (
          <Input id={id} aria-describedby={d} aria-invalid={!!errors.name} value={form.name} onChange={set('name')} autoFocus placeholder="e.g. Coca-Cola 50cl" />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="SKU / code" hint="Optional, must be unique">
          {(id, d) => <Input id={id} aria-describedby={d} value={form.sku} onChange={set('sku')} placeholder="e.g. CC-50" />}
        </Field>
        <Field label="Category">
          {(id) => (
            <Select id={id} value={form.category_id} onChange={set('category_id')}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Unit" required error={errors.unit} hint="How you count it">
          {(id, d) => (
            <>
              <Input id={id} aria-describedby={d} aria-invalid={!!errors.unit} value={form.unit} onChange={set('unit')} list="unit-suggestions" />
              <datalist id="unit-suggestions">
                {UNIT_SUGGESTIONS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Cost price" required error={errors.cost_price} hint={isEdit ? 'Updated automatically by purchases' : 'What you pay per unit'}>
          {(id, d) => (
            <PrefixedInput prefix={CURRENCY} id={id} aria-describedby={d} aria-invalid={!!errors.cost_price} type="number" inputMode="decimal" min="0" step="0.01" value={form.cost_price} onChange={set('cost_price')} />
          )}
        </Field>
        <Field label="Selling price" required error={errors.selling_price}>
          {(id, d) => (
            <PrefixedInput prefix={CURRENCY} id={id} aria-describedby={d} aria-invalid={!!errors.selling_price} type="number" inputMode="decimal" min="0" step="0.01" value={form.selling_price} onChange={set('selling_price')} />
          )}
        </Field>
      </div>

      {showMargin && (
        <p className={profit < 0 ? 'rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700' : 'rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900'}>
          {profit < 0 ? 'Selling below cost: ' : 'Profit per unit: '}
          <span className="tabular font-semibold">{formatCurrency(profit)}</span>
          <span className="tabular text-xs opacity-75"> ({((profit / price) * 100).toFixed(1)}% margin)</span>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {!isEdit && (
          <Field label="Opening stock" error={errors.opening_stock} hint="Quantity on the shelf right now">
            {(id, d) => (
              <Input id={id} aria-describedby={d} aria-invalid={!!errors.opening_stock} type="number" inputMode="decimal" min="0" step="any" className="tabular" value={form.opening_stock} onChange={set('opening_stock')} />
            )}
          </Field>
        )}
        <Field label="Reorder level" error={errors.reorder_level} hint="Warn me when stock falls to this">
          {(id, d) => (
            <Input id={id} aria-describedby={d} aria-invalid={!!errors.reorder_level} type="number" inputMode="decimal" min="0" step="any" className="tabular" value={form.reorder_level} onChange={set('reorder_level')} />
          )}
        </Field>
      </div>

      {isEdit && (
        <p className="flex items-start gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-ink-600">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Stock quantity can't be edited here. Use an inventory adjustment, a sale or a purchase, so every change is recorded.
        </p>
      )}

      <Field label="Notes">
        {(id) => <Textarea id={id} value={form.description} onChange={set('description')} rows={2} placeholder="Optional" />}
      </Field>

      <div className="-mx-5 -mb-4 flex justify-center gap-2 border-t border-stone-100 px-5 py-3 sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {isEdit ? 'Save changes' : 'Add product'}
        </Button>
      </div>
    </form>
  )
}

export default function ProductForm({ open, onClose, product, onSaved }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={product ? 'Edit product' : 'Add product'} size="lg">
      <ProductFormBody key={product?.id ?? 'new'} product={product} onClose={onClose} onSaved={onSaved} />
    </Modal>
  )
}
