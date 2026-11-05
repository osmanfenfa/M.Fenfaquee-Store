import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: string
  icon: LucideIcon
  /** % change vs previous period; null = nothing to compare */
  change: number | null
  changeLabel: string
  /** For expenses, going up is bad */
  upIsGood?: boolean
  footnote?: string
}

export default function SummaryCard({ label, value, icon: Icon, change, changeLabel, upIsGood = true, footnote }: Props) {
  const flat = change === null || Math.abs(change) < 0.5
  const up = !flat && change! > 0
  const good = flat ? null : up === upIsGood
  const Arrow = flat ? Minus : up ? ArrowUpRight : ArrowDownRight

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{label}</p>
        <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="tabular mt-3 text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium',
            good === null && 'bg-stone-100 text-ink-500',
            good === true && 'bg-emerald-50 text-emerald-700',
            good === false && 'bg-red-50 text-red-700',
          )}
        >
          <Arrow className="size-3.5" aria-hidden />
          {change === null ? 'New' : `${Math.abs(change).toFixed(change !== 0 && Math.abs(change) < 10 ? 1 : 0)}%`}
          <span className="sr-only">{flat ? 'no change' : up ? 'increase' : 'decrease'}</span>
        </span>
        <span className="text-ink-400">{changeLabel}</span>
      </div>
      {footnote && <p className="mt-2 text-xs text-ink-500">{footnote}</p>}
    </div>
  )
}
