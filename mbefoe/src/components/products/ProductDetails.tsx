import { useState, type ReactNode } from 'react'
import { Archive, ArchiveRestore, Pencil } from 'lucide-react'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import { useToast } from '@/context/ToastContext'
import { useArchiveProduct, useProduct, useProductMovements, useUpdateProduct } from '@/hooks/useProducts'
import { formatCurrency, formatQuantity } from '@/lib/formatCurrency'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { MOVEMENT_LABELS } from '@/types/inventory'
import type { Product } from '@/types/product'
import StockBadge from './StockBadge'

interface Props {
  productId: number | null
  onClose: () => void
  onEdit: (p: Product) => void
}

const dateTime = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2.5">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="tabular mt-0.5 text-sm font-semibold text-ink-900">{children}</dd>
    </div>
  )
}

function Movements({ productId }: { productId: number }) {
  const [page, setPage] = useState(1)
  const { data, isPending } = useProductMovements(productId, page)

  if (isPending) return <p className="py-4 text-sm text-ink-400">Loading history…</p>
  if (!data?.items.length) return <p className="py-4 text-sm text-ink-400">No stock movements yet.</p>

  return (
    <>
      <ul className="divide-y divide-stone-100">
        {data.items.map((m) => (
          <li key={m.id} className="flex items-start gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-800">{MOVEMENT_LABELS[m.movement_type]}</p>
              <p className="truncate text-xs text-ink-400">
                {dateTime.format(new Date(m.created_at))}
                {m.reason && ` · ${m.reason}`}
              </p>
            </div>
            <div className="tabular text-right text-sm">
              <p className={cn('font-medium', m.quantity_change > 0 ? 'text-emerald-700' : 'text-ink-900')}>
                {m.quantity_change > 0 ? '+' : '−'}
                {formatQuantity(Math.abs(m.quantity_change))}
              </p>
              <p className="text-xs text-ink-400">bal. {formatQuantity(m.quantity_after)}</p>
            </div>
          </li>
        ))}
      </ul>
      {data.pages > 1 && (
        <div className="-mx-5">
          <Pagination page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onChange={setPage} noun="movements" />
        </div>
      )}
    </>
  )
}

export default function ProductDetails({ productId, onClose, onEdit }: Props) {
  const toast = useToast()
  const { data: product } = useProduct(productId)
  const archive = useArchiveProduct()
  const update = useUpdateProduct()
  const [confirmArchive, setConfirmArchive] = useState(false)

  async function doArchive() {
    if (!product) return
    try {
      await archive.mutateAsync(product.id)
      toast.success(`${product.name} archived`)
      setConfirmArchive(false)
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not archive the product')
    }
  }

  async function restore() {
    if (!product) return
    try {
      await update.mutateAsync({ id: product.id, data: { is_active: true } })
      toast.success(`${product.name} restored`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not restore the product')
    }
  }

  const margin = product && product.selling_price > 0 ? ((product.selling_price - product.cost_price) / product.selling_price) * 100 : null

  return (
    <>
      <Modal
        open={productId !== null}
        onClose={onClose}
        variant="side"
        title={product?.name ?? 'Product'}
        description={product ? [product.sku, product.category_name].filter(Boolean).join(' · ') || undefined : undefined}
        footer={
          product && (
            <>
              {product.is_active ? (
                <Button variant="ghost" onClick={() => setConfirmArchive(true)} className="mr-auto">
                  <Archive className="size-4" /> Archive
                </Button>
              ) : (
                <Button variant="ghost" onClick={restore} loading={update.isPending} className="mr-auto">
                  <ArchiveRestore className="size-4" /> Restore
                </Button>
              )}
              <Button onClick={() => onEdit(product)}>
                <Pencil className="size-4" /> Edit
              </Button>
            </>
          )
        }
      >
        {!product ? (
          <p className="text-sm text-ink-400">Loading…</p>
        ) : (
          <div className="flex flex-col gap-6">
            {!product.is_active && (
              <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-ink-600">
                This product is archived. It's hidden from lists and can't be sold until restored.
              </p>
            )}
            <dl className="grid grid-cols-2 gap-2">
              <Stat label="In stock">
                <StockBadge product={product} />
              </Stat>
              <Stat label="Reorder at">
                {formatQuantity(product.reorder_level)} {product.unit}
              </Stat>
              <Stat label="Selling price">{formatCurrency(product.selling_price)}</Stat>
              <Stat label="Cost price (avg)">{formatCurrency(product.cost_price)}</Stat>
              <Stat label="Margin">{margin === null ? '—' : `${margin.toFixed(1)}%`}</Stat>
              <Stat label="Stock value (cost)">{formatCurrency(product.stock_value)}</Stat>
            </dl>

            {product.description && <p className="text-sm whitespace-pre-line text-ink-600">{product.description}</p>}

            <section>
              <h3 className="mb-1 text-sm font-semibold text-ink-900">Stock history</h3>
              <Movements productId={product.id} />
            </section>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmArchive}
        title="Archive this product?"
        message={
          <>
            <strong className="text-ink-900">{product?.name}</strong> will be hidden from product lists and new sales. Its sales
            and stock history are kept, and you can restore it any time.
          </>
        }
        confirmLabel="Archive"
        loading={archive.isPending}
        onConfirm={doArchive}
        onClose={() => setConfirmArchive(false)}
      />
    </>
  )
}
