import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Store } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { inputClass } from '@/components/ui/Field'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { adminService } from '@/services/authService'
import type { AdminShop } from '@/types/auth'

/** Platform admin: every shop on Bu'kuma, with suspend / re-activate. */
export default function Admin() {
  const { user } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<AdminShop | null>(null)
  const { data: shops, isPending, isError, error } = useQuery({ queryKey: ['admin', 'shops'], queryFn: adminService.shops })

  const toggle = useMutation({
    mutationFn: (s: AdminShop) => adminService.setShopActive(s.id, !s.is_active),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['admin', 'shops'] })
      toast.success(s.is_active ? `${s.name} re-activated` : `${s.name} suspended`)
      setConfirm(null)
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not update the shop'),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (shops ?? []).filter((s) => !q || [s.name, s.owner_name, s.owner_username, s.phone].some((v) => v?.toLowerCase().includes(q)))
  }, [shops, search])

  if (!user?.is_superadmin) return <EmptyState>This page is for the Bu&apos;kuma platform admin only.</EmptyState>

  const active = shops?.filter((s) => s.is_active).length ?? 0

  return (
    <>
      <PageHeader title="Shops on Bu'kuma" description="Every shop that has signed up. Suspended shops can't log in; their data is kept." />

      <dl className="mb-4 grid grid-cols-3 gap-3">
        {[
          ['Shops', shops?.length ?? '—'],
          ['Active', shops ? active : '—'],
          ['Suspended', shops ? shops.length - active : '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-xs">
            <dt className="text-xs text-ink-500">{label}</dt>
            <dd className="tabular mt-1 text-lg font-semibold text-ink-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="border-b border-stone-100 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shop, owner or phone…" aria-label="Search shops" className={cn(inputClass, 'pl-10')} />
          </div>
        </div>

        {isError ? (
          <p className="p-6 text-center text-sm text-red-700">{error.message}</p>
        ) : isPending ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-stone-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState>{search ? 'No shops match your search' : 'No shops yet'}</EmptyState>
        ) : (
          <ul className="divide-y divide-stone-100">
            {filtered.map((s) => (
              <li key={s.id} className={cn('flex flex-wrap items-center gap-3 px-4 py-3', !s.is_active && 'bg-stone-50')}>
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', s.is_active ? 'bg-brand-100 text-brand-800' : 'bg-stone-200 text-ink-400')}>
                  <Store className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {s.name}
                    {!s.is_active && <span className="ml-2 rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">Suspended</span>}
                    {s.id === user.shop?.id && <span className="ml-2 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-800">Your shop</span>}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {s.owner_name ?? 'No owner'}
                    {s.owner_username && ` (@${s.owner_username})`}
                    {s.phone && ` · ${s.phone}`} · joined {formatDate(s.created_at.slice(0, 10))}
                  </p>
                </div>
                <p className="tabular text-right text-xs text-ink-500">
                  {s.product_count} products · {s.sale_count} sales
                  <br />
                  {s.last_sale_date ? `last sale ${formatDate(s.last_sale_date)}` : 'no sales yet'}
                </p>
                {s.id !== user.shop?.id && (
                  <Button size="sm" variant={s.is_active ? 'ghost' : 'secondary'} onClick={() => (s.is_active ? setConfirm(s) : toggle.mutate(s))}>
                    {s.is_active ? 'Suspend' : 'Re-activate'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title="Suspend this shop?"
        message={
          <>
            <strong className="text-ink-900">{confirm?.name}</strong> will be signed out and won&apos;t be able to log in until you
            re-activate it. None of their data is deleted.
          </>
        }
        confirmLabel="Suspend"
        danger
        loading={toggle.isPending}
        onConfirm={() => confirm && toggle.mutate(confirm)}
        onClose={() => setConfirm(null)}
      />
    </>
  )
}
