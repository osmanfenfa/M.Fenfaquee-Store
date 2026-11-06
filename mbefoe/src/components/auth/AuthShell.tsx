import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

/** Leopard background + white organic card — shared by Sign in and Sign up. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="leopard flex min-h-svh flex-col items-center px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-8">
      <p className="text-center text-xl font-bold tracking-wide text-ink-950 drop-shadow-[0_1px_0_rgb(255_255_255/0.35)]">Bu&apos;kuma</p>

      <div className="mt-6 flex w-full max-w-sm flex-col items-center rounded-[46%_54%_44%_56%/10%_12%_8%_10%] bg-white px-7 py-12 shadow-2xl sm:py-14">
        <Logo size={84} className="shadow-lg ring-4 ring-brand-200" />
        <h1 className="mt-4 text-2xl font-bold text-brand-800">{title}</h1>
        <p className="mt-1 text-center text-xs text-ink-500">{subtitle}</p>
        <div className="mt-7 w-full">{children}</div>
      </div>

      {footer && <div className="mt-6 text-center text-sm text-ink-950">{footer}</div>}
      <p className="mt-4 text-center text-xs font-medium text-ink-900/70">Shop management — sales, stock, money owed and reports</p>
    </div>
  )
}

/** Pill field with a dark icon block on the left (as in the sample design). */
export function IconField({ icon, children, invalid }: { icon: ReactNode; children: ReactNode; invalid?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-12 items-stretch overflow-hidden rounded-full border bg-white transition focus-within:ring-3',
        invalid ? 'border-red-400 focus-within:ring-red-500/15' : 'border-stone-300 focus-within:border-brand-500 focus-within:ring-brand-500/20',
      )}
    >
      <span className="leopard-dark grid w-12 shrink-0 place-items-center text-brand-300" aria-hidden>
        {icon}
      </span>
      {children}
    </div>
  )
}

export const authInputClass = 'min-w-0 flex-1 bg-transparent px-4 text-sm text-ink-900 outline-none placeholder:text-ink-400'

export function AuthSubmit({ busy, disabled, children }: { busy: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className={cn(
        'leopard-dark mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold tracking-wide text-white shadow-md transition',
        'hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
      )}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}
