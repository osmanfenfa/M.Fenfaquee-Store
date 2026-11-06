import { NavLink } from 'react-router'
import { LogOut } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/types/auth'
import { navGroupsFor } from './navItems'

/** Brand mark: round leopard logo + names. */
export function BrandMark({ className }: { className?: string }) {
  const { user } = useAuth()
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Logo size={44} className="ring-brand-500/60" />
      <div className="leading-tight">
        <p className="text-sm font-semibold text-white">Bu'kuma</p>
        <p className="max-w-40 truncate text-[11px] tracking-wide text-brand-300/80">{user?.shop?.name ?? 'Platform admin'}</p>
      </div>
    </div>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  return (
    <nav className="flex flex-col gap-6" aria-label="Main">
      {navGroupsFor(user).map((group, i) => (
        <div key={group.label ?? i}>
          {group.label && (
            <p className="mb-2 px-3 text-[11px] font-medium tracking-wider text-ink-400 uppercase">
              {group.label}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-brand-500/15 font-medium text-brand-300'
                        : 'text-ink-200 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn('size-4.5 shrink-0', isActive ? 'text-brand-400' : 'text-ink-400 group-hover:text-ink-200')}
                        aria-hidden
                      />
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function SidebarFooter() {
  const { user, logout } = useAuth()
  const initials = (user?.full_name || user?.username || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex items-center gap-3 border-t border-white/10 pt-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-700 text-xs font-semibold text-brand-200">
        {initials}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium text-white">{user?.full_name}</p>
        <p className="truncate text-xs text-ink-400">{user?.is_superadmin && !user.shop ? 'Platform admin' : user ? ROLE_LABELS[user.role] : ''}</p>
      </div>
      <button
        type="button"
        onClick={logout}
        className="rounded-lg p-2 text-ink-400 transition hover:bg-white/5 hover:text-white"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  )
}

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 leopard-dark hidden w-64 flex-col px-4 py-5 lg:flex">
      <BrandMark className="mb-8 px-2" />
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
      <SidebarFooter />
    </aside>
  )
}
