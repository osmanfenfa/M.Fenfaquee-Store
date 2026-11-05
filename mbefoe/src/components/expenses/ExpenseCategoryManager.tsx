import { useState, type FormEvent } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { useToast } from '@/context/ToastContext'
import { useDeleteExpenseCategory, useExpenseCategories, useSaveExpenseCategory } from '@/hooks/useExpenses'
import { ApiError } from '@/services/api'

export default function ExpenseCategoryManager() {
  const toast = useToast()
  const { data: categories = [] } = useExpenseCategories()
  const save = useSaveExpenseCategory()
  const remove = useDeleteExpenseCategory()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : 'Something went wrong')

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setError(null)
    try {
      await save.mutateAsync({ name: newName.trim() })
      setNewName('')
    } catch (err) {
      fail(err)
    }
  }

  async function rename(id: number) {
    if (!editName.trim()) return
    setError(null)
    try {
      await save.mutateAsync({ id, name: editName.trim() })
      setEditingId(null)
    } catch (err) {
      fail(err)
    }
  }

  async function del(id: number, name: string) {
    setError(null)
    try {
      await remove.mutateAsync(id)
      toast.success(`${name} deleted`)
    } catch (err) {
      fail(err)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={add} className="flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category, e.g. Security" aria-label="New category name" />
        <Button type="submit" loading={save.isPending && editingId === null} disabled={!newName.trim()}>
          Add
        </Button>
      </form>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2 px-3 py-2">
            {editingId === c.id ? (
              <>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus aria-label="Category name" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), rename(c.id))} />
                <Button size="sm" variant="ghost" onClick={() => rename(c.id)} aria-label="Save">
                  <Check className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} aria-label="Cancel">
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-ink-800">{c.name}</span>
                <span className="tabular text-xs text-ink-400">{c.expense_count} used</span>
                <Button size="sm" variant="ghost" onClick={() => { setEditingId(c.id); setEditName(c.name) }} aria-label={`Rename ${c.name}`}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => del(c.id, c.name)}
                  disabled={c.expense_count > 0}
                  title={c.expense_count > 0 ? 'In use — cannot delete' : 'Delete'}
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
