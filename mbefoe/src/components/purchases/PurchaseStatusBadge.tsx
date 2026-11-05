import { cn } from '@/lib/utils'
import type { PurchaseStatus } from '@/types/purchase'
import type { PaymentStatus } from '@/types/sales'

export default function PurchaseStatusBadge({ status, paymentStatus }: { status: PurchaseStatus; paymentStatus: PaymentStatus }) {
  const base = 'rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap'
  if (status === 'cancelled') return <span className={cn(base, 'bg-stone-100 text-ink-500')}>Cancelled</span>
  return (
    <span className="inline-flex flex-wrap gap-1">
      {status === 'ordered' && <span className={cn(base, 'bg-sky-50 text-sky-700')}>Awaiting delivery</span>}
      {paymentStatus === 'paid' ? (
        <span className={cn(base, 'bg-emerald-50 text-emerald-700')}>Paid</span>
      ) : (
        <span className={cn(base, 'bg-orange-50 text-orange-700')}>{paymentStatus === 'partial' ? 'Part paid' : 'Unpaid'}</span>
      )}
    </span>
  )
}
