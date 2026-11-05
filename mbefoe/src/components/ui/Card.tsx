import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  className?: string
  bodyClassName?: string
  /** 'form': centred, uppercase title — the sleek form-card look */
  variant?: 'default' | 'form'
  children: ReactNode
}

export default function Card({ title, subtitle, action, className, bodyClassName, variant = 'default', children }: CardProps) {
  const form = variant === 'form'
  return (
    <section className={cn('rounded-3xl border border-stone-200 bg-white shadow-xs', className)}>
      {(title || action) && (
        <header className={cn('flex gap-3 px-5 pt-5', form ? 'flex-col items-center text-center' : 'items-start justify-between')}>
          <div>
            {title && (
              <h2 className={cn(form ? 'text-sm font-bold tracking-[0.12em] text-ink-900 uppercase' : 'text-sm font-semibold text-ink-900')}>{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-ink-400">{children}</p>
}
