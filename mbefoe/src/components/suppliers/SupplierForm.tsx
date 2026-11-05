import { useState, type FormEvent } from 'react'
import { Archive, ArchiveRestore, Truck } from 'lucide-react'
import { Link } from 'react-router'
import Button from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { useToast } from '@/context/ToastContext'
import { useArchiveSupplier, useSaveSupplier } from '@/hooks/usePurchases'
import { formatCurrency } from '@/lib/formatCurrency'
import { ApiError } from '@/services/api'
import type { Supplier } from '@/types/supplier'

interface Props {
  supplier: Supplier | null
  onClose: () => void
  onSaved?: (s: Supplier) => void
}

export default function SupplierForm({ supplier, onClose, onSaved }: Props) {
  const toast = useToast()
  const save = useSaveSupplier()
  const archive = useArchiveSupplier()
  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    contact_person: supplier?.contact_person ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    address: supplier?.address ?? '',
    notes: supplier?.notes ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Enter the supplier name')
    const clean = (v: string) => v.trim() || null
    try {
      const saved = await save.mutateAsync({
        id: supplier?.id,
        data: {
          name: form.name.trim(),
          contact_person: clean(form.contact_person),
          phone: clean(form.phone),
          email: clean(form.email),
          address: clean(form.address),
          notes: clean(form.notes),
        },
      })
      toast.success(supplier ? 'Supplier updated' : `${saved.name} added`)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the supplier')
    }
  }

  async function toggleArchive() {
    if (!supplier) return
    try {
      if (supplier.is_active) {
        await archive.mutateAsync(supplier.id)
        toast.success(`${supplier.name} archived`)
      } else {
        await save.mutateAsync({ id: supplier.id, data: { is_active: true } })
        toast.success(`${supplier.name} restored`)
      }
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the supplier')
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {supplier && (
        <div className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3 text-sm">
          <div>
            <p className="text-ink-500">You owe</p>
            <p className={`tabular text-lg font-semibold ${supplier.balance_owed > 0 ? 'text-orange-700' : 'text-ink-900'}`}>
              {formatCurrency(supplier.balance_owed)}
            </p>
          </div>
          <Link to={`/purchases?supplier=${supplier.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800">
            <Truck className="size-4" /> {supplier.purchase_count} purchase{supplier.purchase_count === 1 ? '' : 's'}
          </Link>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <Field label="Supplier name" required>
        {(id) => <Input id={id} value={form.name} onChange={set('name')} autoFocus={!supplier} placeholder="e.g. Freetown Wholesale" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact person">{(id) => <Input id={id} value={form.contact_person} onChange={set('contact_person')} />}</Field>
        <Field label="Phone">{(id) => <Input id={id} type="tel" value={form.phone} onChange={set('phone')} />}</Field>
      </div>
      <Field label="Email">{(id) => <Input id={id} type="email" value={form.email} onChange={set('email')} />}</Field>
      <Field label="Address">{(id) => <Textarea id={id} rows={2} value={form.address} onChange={set('address')} />}</Field>
      <Field label="Notes">{(id) => <Textarea id={id} rows={2} value={form.notes} onChange={set('notes')} placeholder="e.g. Delivers on Tuesdays" />}</Field>
      <div className="-mx-5 -mb-4 flex justify-center gap-2 border-t border-stone-100 px-5 py-3 sm:justify-end">
        {supplier && (
          <Button variant="ghost" className="mr-auto" onClick={toggleArchive} loading={archive.isPending}>
            {supplier.is_active ? (
              <>
                <Archive className="size-4" /> Archive
              </>
            ) : (
              <>
                <ArchiveRestore className="size-4" /> Restore
              </>
            )}
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {supplier ? 'Save' : 'Add supplier'}
        </Button>
      </div>
    </form>
  )
}
