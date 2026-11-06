import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { AuthShell, AuthSubmit, IconField, authInputClass } from '@/components/auth/AuthShell'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/services/api'

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

  return (
    <AuthShell
      title="Sign In"
      subtitle="Welcome back — sign in to your shop"
      footer={
        <>
          New to Bu&apos;kuma?{' '}
          <Link to="/signup" className="font-bold underline underline-offset-2 hover:text-white">
            Create your shop account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <IconField icon={<User className="size-4.5" />}>
          <input
            aria-label="Username"
            placeholder="Username"
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={authInputClass}
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
            className={authInputClass}
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

        <AuthSubmit busy={submitting} disabled={!username || !password}>
          Sign In
        </AuthSubmit>
      </form>
    </AuthShell>
  )
}
