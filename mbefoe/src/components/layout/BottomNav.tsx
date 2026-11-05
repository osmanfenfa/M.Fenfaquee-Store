import { LayoutDashboard, Menu, Package, Plus, ShoppingCart, type LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { cn } from '@/lib/utils'

const ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/sales', label: 'Sales', icon: ShoppingCart },
  // centre slot = New sale button
  { to: '/products', label: 'Products', icon: Package },
]

function Tab({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  const { pathname } = useLocation()
  // "/sales/new" belongs to the centre button, not the Sales tab
  const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to) && pathname !== '/sales/new'
  return (
    <NavLink
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold transition-colors',
        isActive ? 'bg-brand-100 text-ink-950' : 'text-ink-500 active:bg-stone-100',
      )}
    >
      <Icon className={cn('size-5', isActive ? 'text-brand-800' : 'text-ink-600')} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
      {label}
    </NavLink>
  )
}

/**
 * Phone navigation: icon + label tabs along the bottom (like the sample),
 * with a raised leopard "New sale" button in the middle — the most common task.
 */
export default function BottomNav({ onMore }: { onMore: () => void }) {
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md items-end gap-1 px-2 pt-1.5 pb-1.5">
        <Tab {...ITEMS[0]} />
        <Tab {...ITEMS[1]} />
        <NavLink to="/sales/new" className="flex flex-1 flex-col items-center gap-0.5 text-[11px] font-semibold text-ink-700" aria-label="Record a new sale">
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'leopard -mt-6 grid size-14 place-items-center rounded-full shadow-lg ring-4 ring-white transition-transform active:scale-95',
                  isActive && 'ring-brand-100',
                )}
              >
                <Plus className="size-7 text-ink-950" strokeWidth={2.6} aria-hidden />
              </span>
              New sale
            </>
          )}
        </NavLink>
        <Tab {...ITEMS[2]} />
        <button
          type="button"
          onClick={onMore}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold text-ink-500 active:bg-stone-100"
        >
          <Menu className="size-5 text-ink-600" aria-hidden />
          More
        </button>
      </div>
    </nav>
  )
}
