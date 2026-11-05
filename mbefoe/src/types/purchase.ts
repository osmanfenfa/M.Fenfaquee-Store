import type { Payment, PaymentMethod, PaymentStatus } from './sales'

export type PurchaseStatus = 'ordered' | 'received' | 'cancelled'

export interface PurchaseSummary {
  id: number
  reference: string
  supplier_id: number | null
  supplier_name: string | null
  supplier_invoice_no: string | null
  purchase_date: string
  item_count: number
  total: number
  amount_paid: number
  balance_due: number
  payment_status: PaymentStatus
  status: PurchaseStatus
  created_at: string
}

export interface PurchaseItem {
  id: number
  product_id: number
  product_name: string
  product_unit: string
  quantity: number
  unit_cost: number
  line_total: number
}

export interface PurchaseDetail extends PurchaseSummary {
  received_at: string | null
  cancel_reason: string | null
  notes: string | null
  items: PurchaseItem[]
  payments: Payment[]
}

export interface PurchaseCreateInput {
  supplier_id: number | null
  supplier_invoice_no: string | null
  purchase_date: string
  status: 'received' | 'ordered'
  items: { product_id: number; quantity: number; unit_cost: number; new_selling_price: number | null }[]
  notes: string | null
  payment: { amount: number; method: PaymentMethod; reference: string | null } | null
}

export interface PurchaseFilters {
  search?: string
  supplier_id?: number
  date_from?: string
  date_to?: string
  status?: PurchaseStatus
  outstanding?: boolean
  page?: number
  page_size?: number
}
