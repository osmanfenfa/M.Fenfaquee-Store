import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** 'center' dialog, or 'side' panel sliding from the right (details views) */
  variant?: 'center' | 'side'
}

/** Accessible dialog built on the native <dialog> element (focus trap + Esc for free). */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md', variant = 'center' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()} // click on backdrop
      aria-labelledby={titleId}
      className={cn(
        'm-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-ink-950/45 backdrop:backdrop-blur-[2px]',
        // `open:` only — a closed <dialog> must stay display:none, or its
        // full-screen box sits invisibly over the page and swallows clicks.
        variant === 'center' ? 'fixed inset-0 h-full w-full open:grid open:place-items-end sm:open:place-items-center sm:p-4' : 'fixed inset-0 h-full w-full',
      )}
    >
      {open && (
        <div
          className={cn(
            'flex flex-col bg-white shadow-xl',
            variant === 'center'
              ? cn('max-h-[92svh] w-full rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:rounded-3xl sm:pb-0', { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size])
              : 'ml-auto h-full w-full max-w-xl',
          )}
        >
          {variant === 'center' && <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-stone-300 sm:hidden" aria-hidden />}
          <header className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-bold tracking-wide text-ink-900">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 rounded-full p-1.5 text-ink-400 hover:bg-stone-100 hover:text-ink-700"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <footer className="flex justify-center gap-2 border-t border-stone-100 px-5 py-3 sm:justify-end">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
