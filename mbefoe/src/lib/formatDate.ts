/** Dates travel as 'YYYY-MM-DD' strings; build them from LOCAL date parts (not UTC). */
export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Parse 'YYYY-MM-DD' as a local date (new Date('2026-11-05') would be UTC). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' })

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/

/**
 * Format safely: anything that isn't a valid 'YYYY-MM-DD' date (e.g. a
 * "Total" label in a date column, or a missing value) is returned unchanged
 * instead of throwing "RangeError: Invalid time value".
 */
function safeFormat(fmt: Intl.DateTimeFormat, s: string | null | undefined): string {
  if (!s) return ''
  if (!ISO_DATE.test(s)) return s
  const d = parseISODate(s)
  // Reject impossible dates (e.g. month 13) instead of letting them roll over
  if (Number.isNaN(d.getTime()) || toISODate(d) !== s.slice(0, 10)) return s
  return fmt.format(d)
}

/** 5 Nov 2026 */
export function formatDate(s: string | null | undefined): string {
  return safeFormat(dayFmt, s)
}

/** 5 Nov */
export function formatShortDate(s: string | null | undefined): string {
  return safeFormat(shortFmt, s)
}

/** Nov 2026 */
export function formatMonth(s: string | null | undefined): string {
  return safeFormat(monthFmt, s)
}

export type PeriodKey = 'today' | '7d' | 'month' | 'last_month' | 'year'

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: 'month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'year', label: 'This year' },
]

export function periodRange(key: PeriodKey, now = new Date()): { from: string; to: string } {
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (key) {
    case 'today':
      return { from: toISODate(now), to: toISODate(now) }
    case '7d':
      return { from: toISODate(new Date(y, m, now.getDate() - 6)), to: toISODate(now) }
    case 'month':
      return { from: toISODate(new Date(y, m, 1)), to: toISODate(now) }
    case 'last_month':
      return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) }
    case 'year':
      return { from: toISODate(new Date(y, 0, 1)), to: toISODate(now) }
  }
}

export function previousPeriodLabel(key: PeriodKey): string {
  return {
    today: 'vs yesterday',
    '7d': 'vs previous 7 days',
    month: 'vs same days last month',
    last_month: 'vs month before',
    year: 'vs same days last year',
  }[key]
}
