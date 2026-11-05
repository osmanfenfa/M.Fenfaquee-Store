import { useState, type FormEvent, type ReactNode } from 'react'
import { Eye, EyeOff, Loader2, Lock, User } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import Logo from '@/components/ui/Logo'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'

/** Pill field with a dark icon block on the left (as in the sample design). */
function IconField({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-12 items-stretch overflow-hidden rounded-full border border-stone-300 bg-white transition focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/20">
      <span className="leopard-dark grid w-12 shrink-0 place-items-center text-brand-300" aria-hidden>
        {icon}
      </span>
      {children}
    </div>
  )
}

export default function Login() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login({ username: username.trim(), password })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'min-w-0 flex-1 bg-transparent px-4 text-sm text-ink-900 outline-none placeholder:text-ink-400'

  return (
    <div className="leopard flex min-h-svh flex-col items-center px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-8">
      <p className="text-center text-xl font-bold tracking-wide text-ink-950 drop-shadow-[0_1px_0_rgb(255_255_255/0.35)]">M Fenfaquee Ent</p>

      {/* Organic white card */}
      <div className="mt-8 flex w-full max-w-sm flex-1 flex-col items-center justify-center rounded-[46%_54%_44%_56%/14%_16%_12%_14%] bg-white px-7 py-14 shadow-2xl sm:flex-none sm:py-16">
        <Logo size={96} className="shadow-lg ring-4 ring-brand-200" />
        <h1 className="mt-4 text-2xl font-bold text-brand-800">Sign In</h1>
        <p className="mt-1 text-center text-xs text-ink-500">Bu'kuma · owner account</p>

        <form onSubmit={onSubmit} noValidate className="mt-8 flex w-full flex-col gap-4">
          <IconField icon={<User className="size-4.5" />}>
            <input
              aria-label="Username"
              placeholder="Username"
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputCls}
            />
          </IconField>

          <IconField icon={<Lock className="size-4.5" />}>
            <input
              aria-label="Password"
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="grid w-11 place-items-center text-ink-400 hover:text-ink-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
            </button>
          </IconField>

          {error && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2 text-center text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className={cn(
              'leopard-dark mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full text-sm font-bold tracking-wide text-white shadow-md transition',
              'hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Sign In
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs font-medium text-ink-900/70">Shop management for M.Fenfaquee Enterprise</p>
    </div>
  )
}
