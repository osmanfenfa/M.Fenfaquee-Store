export const CURRENCY = 'NLe'

const full = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const qty = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 })

/** NLe 1,234.50 */
export function formatCurrency(value: number | null | undefined): string {
  const n = value ?? 0
  return `${n < 0 ? '-' : ''}${CURRENCY} ${full.format(Math.abs(n))}`
}

/** NLe 1.2K — for chart axes and tight spaces */
export function formatCurrencyCompact(value: number): string {
  return `${value < 0 ? '-' : ''}${CURRENCY} ${compact.format(Math.abs(value))}`
}

/** 12 or 2.5 — quantities without trailing zeros */
export function formatQuantity(value: number): string {
  return qty.format(value)
}

/** % change from previous to current; null when there's no base to compare with */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}
