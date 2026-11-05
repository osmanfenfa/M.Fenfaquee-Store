import { Input, Select } from '@/components/ui/Field'
import { toISODate } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import type { ReportType } from '@/types/report'
import { REPORTS, type RangeKey } from './reportCatalog'

interface Props {
  type: ReportType
  onType: (t: ReportType) => void
  range: RangeKey
  onRange: (r: RangeKey) => void
  customFrom: string
  customTo: string
  onCustom: (from: string, to: string) => void
}

export default function ReportFilters({ type, onType, range, onRange, customFrom, customTo, onCustom }: Props) {
  const dated = REPORTS.find((r) => r.type === type)?.dated
  const today = toISODate(new Date())
  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Report" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {REPORTS.map(({ type: t, title, description, icon: Icon }) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => onType(t)}
            className={cn(
              'flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition',
              type === t ? 'border-ink-900 bg-ink-900 text-white shadow-md' : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs',
            )}
          >
            <Icon className={cn('size-5', type === t ? 'text-brand-400' : 'text-brand-700')} aria-hidden />
            <span className="text-sm font-semibold">{title}</span>
            <span className={cn('text-xs', type === t ? 'text-ink-200' : 'text-ink-500')}>{description}</span>
          </button>
        ))}
      </div>

      {dated && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="text-sm text-ink-600 sm:w-48">
            <span className="mb-1.5 block font-medium text-ink-700">Period</span>
            <Select value={range} onChange={(e) => onRange(e.target.value as RangeKey)}>
              <option value="month">This month</option>
              <option value="last_month">Last month</option>
              <option value="year">This year</option>
              <option value="custom">Custom dates…</option>
            </Select>
          </label>
          {range === 'custom' && (
            <>
              <label className="text-sm sm:w-44">
                <span className="mb-1.5 block font-medium text-ink-700">From</span>
                <Input type="date" max={customTo || today} value={customFrom} onChange={(e) => onCustom(e.target.value, customTo)} />
              </label>
              <label className="text-sm sm:w-44">
                <span className="mb-1.5 block font-medium text-ink-700">To</span>
                <Input type="date" min={customFrom} max={today} value={customTo} onChange={(e) => onCustom(customFrom, e.target.value)} />
              </label>
            </>
          )}
        </div>
      )}
    </div>
  )
}
