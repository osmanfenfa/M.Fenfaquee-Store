import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Copy, Home, RefreshCw, WifiOff } from 'lucide-react'
import { Link, isRouteErrorResponse, useRouteError } from 'react-router'
import Button, { buttonStyles } from '@/components/ui/Button'
import { errorReport, logError, sourceLocation, toError, type ErrorEntry } from '@/lib/errorLog'
import { ApiError } from '@/services/api'

interface Explanation {
  title: string
  message: string
  hint: string
  icon: typeof AlertTriangle
}

/** Turn a technical error into words the shop owner can act on. */
function explain(err: unknown): Explanation {
  if (isRouteErrorResponse(err) && err.status === 404) {
    return { title: 'Page not found', message: "The page you tried to open doesn't exist.", hint: 'Check the address, or go back to the dashboard.', icon: AlertTriangle }
  }
  if (err instanceof ApiError && err.status === 0) {
    return {
      title: "Can't reach the server",
      message: err.message,
      hint: 'Check your internet connection. Locally, make sure the backend terminal is running. Online, the server may be waking up — wait a minute and try again.',
      icon: WifiOff,
    }
  }
  const e = toError(err)
  if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(e.message)) {
    return {
      title: 'A new version is available',
      message: 'Bu\'kuma was updated while this page was open.',
      hint: 'Reload the page to get the latest version.',
      icon: RefreshCw,
    }
  }
  return {
    title: 'Something went wrong on this page',
    message: e.message || 'An unexpected error occurred.',
    hint: 'Your data is safe — nothing was saved by this error. Try again; if it keeps happening, copy the details below and send them to your developer.',
    icon: AlertTriangle,
  }
}

/**
 * Shown instead of a page when it crashes (React Router errorElement).
 * Friendly explanation + actions + copyable technical details.
 */
export default function RouteError({ fullPage = false }: { fullPage?: boolean }) {
  const error = useRouteError()
  const [copied, setCopied] = useState(false)

  const entry: ErrorEntry = useMemo(() => {
    const err = isRouteErrorResponse(error) ? new Error(`${error.status} ${error.statusText}`) : error
    return logError('Page crashed', err)
    // log once per error
  }, [error])

  useEffect(() => {
    document.title = "Error · Bu'kuma"
  }, [])

  const info = explain(error)
  const Icon = info.icon
  const location = sourceLocation(entry.stack)

  async function copy() {
    try {
      await navigator.clipboard.writeText(errorReport(entry))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* clipboard blocked — details are still visible below */
    }
  }

  return (
    <div className={fullPage ? 'grid min-h-svh place-items-center bg-stone-50 p-4' : 'py-6'}>
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-600">
          <Icon className="size-7" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink-900">{info.title}</h1>
        <p className="mt-2 text-sm font-medium text-red-700" role="alert">
          {info.message}
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-600">{info.hint}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" /> Try again
          </Button>
          <Link to="/" className={buttonStyles('secondary')} reloadDocument>
            <Home className="size-4" /> Go to dashboard
          </Link>
          <Button variant="ghost" onClick={copy}>
            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy error details'}
          </Button>
        </div>

        <details className="mt-6 rounded-2xl bg-stone-50 p-4 text-left text-xs text-ink-600">
          <summary className="cursor-pointer font-medium text-ink-700 select-none">Technical details</summary>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-ink-400">Error</dt>
            <dd className="font-mono break-all">
              {entry.name}: {entry.message}
            </dd>
            {location && (
              <>
                <dt className="text-ink-400">Source</dt>
                <dd className="font-mono">src/{location}</dd>
              </>
            )}
            <dt className="text-ink-400">Page</dt>
            <dd className="font-mono break-all">{entry.page}</dd>
            <dt className="text-ink-400">Time</dt>
            <dd className="font-mono">{new Date(entry.time).toLocaleString('en-GB')}</dd>
          </dl>
          {entry.stack && (
            <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-ink-900 p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-ink-100">
              {entry.stack}
            </pre>
          )}
        </details>
      </div>
    </div>
  )
}
