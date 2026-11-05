import { logError } from '@/lib/errorLog'

const BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api/v1'
const TOKEN_KEY = 'bukuma.token'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// ---------- token storage (guarded: storage can be blocked) ----------
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  },
}

/** Called when the API says the session is no longer valid (set by AuthContext). */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

type Query = Record<string, string | number | boolean | null | undefined>

function buildUrl(path: string, query?: Query): string {
  const url = `${BASE_URL}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

const STATUS_TEXT: Record<number, string> = {
  400: 'The request was not accepted',
  403: "You don't have permission to do that",
  404: 'Not found — it may have been deleted',
  408: 'The server took too long to respond',
  413: 'The data sent was too large',
  429: 'Too many requests — wait a moment and try again',
  500: 'The server hit an unexpected error',
  502: 'The server is unavailable (it may be starting up) — try again in a minute',
  503: 'The server is temporarily unavailable — try again in a minute',
  504: 'The server took too long to respond — try again',
}

function fallbackMessage(status: number, action: string): string {
  return `${action} failed: ${STATUS_TEXT[status] ?? `HTTP ${status}`}`
}

const OFFLINE_MESSAGE =
  "Cannot reach the server. Check your internet connection; when running locally, make sure the backend terminal is running (port 8010)."

/** FastAPI errors: {detail: "msg"} or {detail: [{msg, loc}, ...]} */
function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length) {
      return detail
        .map((d: { msg?: string; loc?: unknown[] }) => {
          const field = d.loc?.filter((p) => p !== 'body').join('.')
          return field ? `${field}: ${d.msg}` : d.msg
        })
        .join('; ')
    }
  }
  return fallback
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Query
  json?: unknown
  form?: URLSearchParams
  signal?: AbortSignal
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.json)
  } else if (opts.form) {
    body = opts.form
  }

  let res: Response
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body,
      signal: opts.signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    logError('Network error', e, { request: `${opts.method ?? 'GET'} ${path}` })
    throw new ApiError(0, OFFLINE_MESSAGE)
  }

  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.()
    const err = new ApiError(res.status, errorMessage(data, fallbackMessage(res.status, 'Request')))
    if (res.status >= 500) logError('Server error', err, { request: `${opts.method ?? 'GET'} ${path}`, status: res.status })
    throw err
  }
  return data as T
}

/**
 * Download a file (PDF/Excel) with the auth header and save it via the browser.
 * A plain <a href> can't send the Bearer token, so we fetch the blob ourselves.
 */
export async function downloadFile(path: string, query?: Query): Promise<void> {
  const headers: Record<string, string> = {}
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(buildUrl(path, query), { headers })
  } catch (e) {
    logError('Network error (download)', e, { request: `GET ${path}` })
    throw new ApiError(0, OFFLINE_MESSAGE)
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    if (res.status === 401 && token) onUnauthorized?.()
    const err = new ApiError(res.status, errorMessage(data, fallbackMessage(res.status, 'Download')))
    logError('Download failed', err, { request: `GET ${path}`, status: res.status })
    throw err
  }
  const blob = await res.blob()
  const match = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') ?? '')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = match?.[1] ?? 'report'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, json?: unknown) => request<T>(path, { method: 'POST', json }),
  patch: <T>(path: string, json?: unknown) => request<T>(path, { method: 'PATCH', json }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
}
