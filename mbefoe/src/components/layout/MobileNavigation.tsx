import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandMark, SidebarFooter, SidebarNav } from './Sidebar'

interface Props {
  open: boolean
  onClose: () => void
}

/** Slide-in navigation drawer for phones and tablets. */
export default function MobileNavigation({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <div className={cn('fixed inset-0 z-40 lg:hidden', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div
        className={cn('absolute inset-0 bg-ink-950/50 transition-opacity', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          'leopard-dark absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col px-4 py-5 shadow-xl transition-transform',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <BrandMark />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-300 hover:bg-white/5 hover:text-white"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav onNavigate={onClose} />
        </div>
        <SidebarFooter />
      </aside>
    </div>
  )
}
