/**
 * Small error logger: writes a clear, grouped entry to the browser console
 * and keeps the last few errors in memory so the error page can offer a
 * "Copy details" report that is useful to send to the developer.
 */

export interface ErrorEntry {
  time: string
  where: string
  name: string
  message: string
  stack?: string
  page: string
  extra?: Record<string, unknown>
}

const recent: ErrorEntry[] = []
const MAX = 10

export function toError(err: unknown): Error {
  if (err instanceof Error) return err
  if (typeof err === 'string') return new Error(err)
  try {
    return new Error(JSON.stringify(err))
  } catch {
    return new Error(String(err))
  }
}

/** First stack line that points at our own source code, e.g. "ReportPreview.tsx:21". */
export function sourceLocation(stack?: string): string | null {
  if (!stack) return null
  for (const line of stack.split('\n')) {
    const m = /\/src\/([^?:)]+)(?:\?[^:)]*)?:(\d+)/.exec(line)
    if (m) return `${m[1]}:${m[2]}`
  }
  return null
}

export function logError(where: string, err: unknown, extra?: Record<string, unknown>): ErrorEntry {
  const e = toError(err)
  const entry: ErrorEntry = {
    time: new Date().toISOString(),
    where,
    name: e.name,
    message: e.message,
    stack: e.stack,
    page: window.location.pathname + window.location.search,
    extra,
  }
  recent.unshift(entry)
  recent.length = Math.min(recent.length, MAX)

  console.groupCollapsed(`%c[Bu'kuma] ${where}: ${e.name}: ${e.message}`, 'color:#b91c1c;font-weight:bold')
  console.log('Page:', entry.page)
  console.log('Time:', entry.time)
  const loc = sourceLocation(e.stack)
  if (loc) console.log('Source:', loc)
  if (extra) console.log('Details:', extra)
  console.error(e)
  console.groupEnd()
  return entry
}

export function recentErrors(): ErrorEntry[] {
  return [...recent]
}

/** Plain-text report for the clipboard. */
export function errorReport(entry: ErrorEntry): string {
  const lines = [
    `Bu'kuma error report`,
    `Time:    ${entry.time}`,
    `Page:    ${entry.page}`,
    `Where:   ${entry.where}`,
    `Error:   ${entry.name}: ${entry.message}`,
    `Source:  ${sourceLocation(entry.stack) ?? 'unknown'}`,
    `Browser: ${navigator.userAgent}`,
  ]
  if (entry.extra) lines.push(`Details: ${JSON.stringify(entry.extra)}`)
  if (entry.stack) lines.push('', 'Stack trace:', entry.stack)
  const older = recent.filter((r) => r !== entry).slice(0, 3)
  if (older.length) {
    lines.push('', 'Earlier errors this session:')
    for (const r of older) lines.push(`- ${r.time} ${r.where}: ${r.name}: ${r.message} (${r.page})`)
  }
  return lines.join('\n')
}

/** Log errors that happen outside React (event handlers, async code). Call once at startup. */
export function installGlobalErrorLogging() {
  window.addEventListener('error', (e) => logError('Uncaught error', e.error ?? e.message))
  window.addEventListener('unhandledrejection', (e) => logError('Unhandled promise rejection', e.reason))
}
