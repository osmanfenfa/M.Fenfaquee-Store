import { cn } from '@/lib/utils'
import type { PaymentStatus, SaleStatus } from '@/types/sales'

const PAYMENT_STYLES: Record<PaymentStatus, [string, string]> = {
  paid: ['bg-emerald-50 text-emerald-700', 'Paid'],
  partial: ['bg-orange-50 text-orange-700', 'Part paid'],
  unpaid: ['bg-red-50 text-red-700', 'Unpaid'],
}

export default function SaleStatusBadge({ status, paymentStatus }: { status: SaleStatus; paymentStatus: PaymentStatus }) {
  if (status === 'voided')
    return <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-ink-500">Voided</span>
  const [style, label] = PAYMENT_STYLES[paymentStatus]
  return <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap', style)}>{label}</span>
}
