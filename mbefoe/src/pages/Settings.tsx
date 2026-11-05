import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Field, Input, Textarea } from '@/components/ui/Field'
import Logo from '@/components/ui/Logo'
import { useToast } from '@/context/ToastContext'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useShopSettings } from '@/hooks/useSales'
import { ApiError } from '@/services/api'
import { authService } from '@/services/authService'
import { settingsService } from '@/services/settingsService'
import type { ShopSettings } from '@/types/settings'

function ShopDetailsForm({ shop }: { shop: ShopSettings }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    shop_name: shop.shop_name,
    address: shop.address ?? '',
    phone: shop.phone ?? '',
    receipt_note: shop.receipt_note ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.shop_name.trim()) return setError('Enter the shop name')
    setSaving(true)
    setError(null)
    try {
      const saved = await settingsService.updateShop(form)
      qc.setQueryData(['settings', 'shop'], saved)
      toast.success('Shop details saved')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Field label="Shop name" required>
        {(id) => <Input id={id} value={form.shop_name} onChange={set('shop_name')} />}
      </Field>
      <Field label="Address" hint="Printed at the top of receipts">
        {(id, d) => <Textarea id={id} aria-describedby={d} rows={2} value={form.address} onChange={set('address')} placeholder="e.g. 12 Kissy Road, Freetown" />}
      </Field>
      <Field label="Phone number">
        {(id) => <Input id={id} type="tel" value={form.phone} onChange={set('phone')} placeholder="e.g. +232 76 000 000" />}
      </Field>
      <Field label="Thank-you note" hint="Printed at the bottom of receipts">
        {(id, d) => <Input id={id} aria-describedby={d} value={form.receipt_note} onChange={set('receipt_note')} maxLength={255} />}
      </Field>
      <div>
        <Button type="submit" loading={saving}>
          Save shop details
        </Button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (next.length < 8) return setError('New password must be at least 8 characters')
    if (next !== confirm) return setError('New passwords do not match')
    setSaving(true)
    setError(null)
    try {
      await authService.changePassword(current, next)
      toast.success('Password changed')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Field label="Current password">
        {(id) => <Input id={id} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}
      </Field>
      <Field label="New password" hint="At least 8 characters">
        {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}
      </Field>
      <Field label="Confirm new password">
        {(id) => <Input id={id} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
      </Field>
      <div>
        <Button type="submit" variant="secondary" loading={saving} disabled={!current || !next}>
          Change password
        </Button>
      </div>
    </form>
  )
}

function InstallCard() {
  const { canInstall, installed, ios, install } = useInstallPrompt()
  return (
    <Card variant="form" title="Install the app" className="lg:col-span-2">
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
        <Logo size={56} />
        <div className="flex-1 text-sm text-ink-600">
          {installed ? (
            <p>Bu'kuma is installed on this device. Open it from your home screen.</p>
          ) : canInstall ? (
            <p>Add Bu'kuma to your home screen — it opens full-screen like a normal app.</p>
          ) : ios ? (
            <p>
              On iPhone: tap the <strong>Share</strong> button in Safari, then <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p>
              Open this site in Chrome on your phone, then choose <strong>Install app</strong> (or <strong>Add to Home screen</strong>)
              from the ⋮ menu.
            </p>
          )}
        </div>
        {canInstall && !installed && (
          <Button onClick={install}>
            <Download className="size-4" /> Install app
          </Button>
        )}
      </div>
    </Card>
  )
}

export default function Settings() {
  const { data: shop, isPending } = useShopSettings()
  return (
    <>
      <PageHeader title="Settings" description="Shop details for receipts, your password, and installing the app." />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <InstallCard />
        <Card variant="form" title="Shop details">{isPending || !shop ? <p className="text-sm text-ink-400">Loading…</p> : <ShopDetailsForm shop={shop} />}</Card>
        <Card variant="form" title="Password">
          <PasswordForm />
        </Card>
      </div>
    </>
  )
}
