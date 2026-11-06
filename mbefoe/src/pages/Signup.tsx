import { useState, type FormEvent, type ReactNode } from 'react'
import { AtSign, Eye, EyeOff, Lock, MapPin, Phone, Store, User } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router'
import { AuthShell, AuthSubmit, IconField, authInputClass } from '@/components/auth/AuthShell'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/services/api'

interface Form {
  shop_name: string
  full_name: string
  username: string
  password: string
  confirm: string
  phone: string
  address: string
}

const USERNAME_RE = /^[A-Za-z0-9._-]+$/

function validate(f: Form): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {}
  if (f.shop_name.trim().length < 2) e.shop_name = 'Enter your shop or business name'
  if (f.full_name.trim().length < 2) e.full_name = 'Enter your full name'
  if (f.username.trim().length < 3) e.username = 'At least 3 characters'
  else if (!USERNAME_RE.test(f.username.trim())) e.username = 'Letters, numbers, dots, dashes or underscores — no spaces'
  if (f.password.length < 8) e.password = 'At least 8 characters'
  if (f.confirm !== f.password) e.confirm = 'Passwords do not match'
  return e
}

function Row({ icon, error, children }: { icon: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div>
      <IconField icon={icon} invalid={!!error}>
        {children}
      </IconField>
      {error && <p className="mt-1 ml-4 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function Signup() {
  const { signup, status } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>({ shop_name: '', full_name: '', username: '', password: '', confirm: '', phone: '', address: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (status === 'authenticated') return <Navigate to="/" replace />

  const errors = submitted ? validate(form) : {}
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setServerError(null)
    if (Object.keys(validate(form)).length) return
    setBusy(true)
    try {
      await signup({
        shop_name: form.shop_name.trim(),
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Could not create your account. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const icon = 'size-4.5'

  return (
    <AuthShell
      title="Create your shop"
      subtitle="Free to start — you'll be the shop owner"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-bold underline underline-offset-2 hover:text-white">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
        <p className="ml-4 text-[11px] font-semibold tracking-wider text-ink-500 uppercase">Your shop</p>
        <Row icon={<Store className={icon} />} error={errors.shop_name}>
          <input aria-label="Shop name" placeholder="Shop name" autoFocus value={form.shop_name} onChange={set('shop_name')} className={authInputClass} aria-invalid={!!errors.shop_name} />
        </Row>
        <Row icon={<Phone className={icon} />}>
          <input aria-label="Shop phone (optional)" placeholder="Phone (optional)" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} className={authInputClass} />
        </Row>
        <Row icon={<MapPin className={icon} />}>
          <input aria-label="Shop address (optional)" placeholder="Address (optional)" autoComplete="street-address" value={form.address} onChange={set('address')} className={authInputClass} />
        </Row>

        <p className="mt-2 ml-4 text-[11px] font-semibold tracking-wider text-ink-500 uppercase">You (the owner)</p>
        <Row icon={<User className={icon} />} error={errors.full_name}>
          <input aria-label="Your full name" placeholder="Your full name" autoComplete="name" value={form.full_name} onChange={set('full_name')} className={authInputClass} aria-invalid={!!errors.full_name} />
        </Row>
        <Row icon={<AtSign className={icon} />} error={errors.username}>
          <input aria-label="Username" placeholder="Username (for signing in)" autoComplete="username" autoCapitalize="none" value={form.username} onChange={set('username')} className={authInputClass} aria-invalid={!!errors.username} />
        </Row>
        <Row icon={<Lock className={icon} />} error={errors.password}>
          <input
            aria-label="Password"
            placeholder="Password (8+ characters)"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            className={authInputClass}
            aria-invalid={!!errors.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="grid w-11 place-items-center text-ink-400 hover:text-ink-700"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className={icon} /> : <Eye className={icon} />}
          </button>
        </Row>
        <Row icon={<Lock className={icon} />} error={errors.confirm}>
          <input
            aria-label="Confirm password"
            placeholder="Confirm password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
            className={authInputClass}
            aria-invalid={!!errors.confirm}
          />
        </Row>

        {serverError && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2 text-center text-sm text-red-700">
            {serverError}
          </p>
        )}

        <AuthSubmit busy={busy}>Create shop account</AuthSubmit>
        <p className="text-center text-[11px] text-ink-400">Your shop&apos;s data is private — no other shop can see it.</p>
      </form>
    </AuthShell>
  )
}
