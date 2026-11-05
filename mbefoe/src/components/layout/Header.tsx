import { useLocation } from 'react-router'
import Logo from '@/components/ui/Logo'
import { useAuth } from '@/hooks/useAuth'
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
  const { user } = useAuth()
  const { pathname } = useLocation()
  const current = ALL_NAV_ITEMS.find((i) => (i.to === '/' ? pathname === '/' : pathname.startsWith(i.to)))

  return (
    <>
      <header className="leopard sticky top-0 z-20 shadow-md lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex h-16 items-center gap-3 px-4">
          <Logo size={38} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[15px] font-bold text-ink-950">Bu'kuma</p>
            <p className="truncate text-[11px] font-medium text-ink-900/75">{current?.label ?? 'M.Fenfaquee Ent'}</p>
          </div>
          <div className="min-w-0 text-right leading-tight">
            <p className="max-w-36 truncate text-[13px] font-semibold text-ink-950">{user?.full_name}</p>
            <p className="text-[11px] font-medium text-ink-900/75">Owner</p>
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
