import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Field, Input, Textarea } from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/context/ToastContext'
import { useCategories, useDeleteCategory, useSaveCategory } from '@/hooks/useProducts'
import { ApiError } from '@/services/api'
import type { Category } from '@/types/product'

function CategoryForm({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveCategory()
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Enter a category name')
    try {
      const saved = await save.mutateAsync({
        id: category?.id,
        data: { name: name.trim(), description: description.trim() || null },
      })
      toast.success(category ? 'Category updated' : `${saved.name} added`)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the category')
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Name" required error={error ?? undefined}>
        {(id, d) => (
          <Input id={id} aria-describedby={d} aria-invalid={!!error} value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Beverages" />
        )}
      </Field>
      <Field label="Description">
        {(id) => <Textarea id={id} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />}
      </Field>
      <div className="-mx-5 -mb-4 flex justify-center gap-2 border-t border-stone-100 px-5 py-3 sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {category ? 'Save' : 'Add category'}
        </Button>
      </div>
    </form>
  )
}

export default function Categories() {
  const toast = useToast()
  const { data: categories, isPending, isError, error } = useCategories()
  const remove = useDeleteCategory()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  function openForm(c: Category | null) {
    setEditing(c)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success(`${deleting.name} deleted`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not delete the category')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group your products to find and report on them easily."
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus className="size-4" /> Add category
          </Button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
        {isError ? (
          <p className="p-6 text-center text-sm text-red-700">{error.message}</p>
        ) : isPending ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-stone-100" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState>No categories yet — add one like “Beverages” or “Provisions”.</EmptyState>
        ) : (
          <ul className="divide-y divide-stone-100">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{c.name}</p>
                  {c.description && <p className="truncate text-xs text-ink-500">{c.description}</p>}
                </div>
                <Link
                  to={`/products?category=${c.id}`}
                  className="tabular rounded-md bg-stone-100 px-2 py-1 text-xs whitespace-nowrap text-ink-600 hover:bg-brand-50 hover:text-brand-800"
                >
                  {c.product_count} product{c.product_count === 1 ? '' : 's'}
                </Link>
                <Button variant="ghost" size="sm" onClick={() => openForm(c)} aria-label={`Rename ${c.name}`}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleting(c)}
                  disabled={c.product_count > 0}
                  title={c.product_count > 0 ? 'Move its products to another category first' : 'Delete'}
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit category' : 'Add category'} size="sm">
        <CategoryForm key={editing?.id ?? 'new'} category={editing} onClose={() => setFormOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete category?"
        message={
          <>
            Delete <strong className="text-ink-900">{deleting?.name}</strong>? This can't be undone.
          </>
        }
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}
