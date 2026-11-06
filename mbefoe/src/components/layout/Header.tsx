import { LogOut } from 'lucide-react'
import { useLocation } from 'react-router'
import Logo from '@/components/ui/Logo'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABELS } from '@/types/auth'
import { ALL_NAV_ITEMS } from './navItems'

const todayLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

function initials(name: string | undefined) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Mobile: leopard app bar — logo + app name on the left, owner name, role and
 * avatar on the right (matching the sample design).
 * Desktop: slim white bar with today's date (the sidebar carries the brand).
 */
export default function Header() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const current = ALL_NAV_ITEMS.find((i) => (i.to === '/' ? pathname === '/' : pathname.startsWith(i.to)))

  return (
    <>
      <header className="leopard sticky top-0 z-20 shadow-md lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex h-[4.5rem] items-center gap-3 px-4">
          <Logo size={38} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[15px] font-bold text-ink-950">Bu'kuma</p>
            <p className="truncate text-[11px] font-medium text-ink-900/75">{user?.shop?.name ?? current?.label ?? 'Platform admin'}</p>
          </div>
          <div className="flex min-w-0 flex-col items-end leading-tight">
            <p className="max-w-36 truncate text-[13px] font-semibold text-ink-950">{user?.full_name}</p>
            <p className="text-[11px] font-medium text-ink-900/75">{user ? ROLE_LABELS[user.role] : ''}</p>
            <button
              type="button"
              onClick={logout}
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-ink-950/85 px-2 py-0.5 text-[10px] font-semibold text-brand-200 transition active:scale-95 hover:bg-ink-950"
            >
              <LogOut className="size-3" aria-hidden /> Log out
            </button>
          </div>
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-ink-900 text-xs font-bold text-brand-300 ring-2 ring-white/70">
            {initials(user?.full_name)}
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-20 hidden h-14 items-center border-b border-stone-200 bg-white/85 px-6 backdrop-blur lg:flex">
        <p className="ml-auto text-sm text-ink-500">{todayLabel.format(new Date())}</p>
      </header>
    </>
  )
}
