export type PaymentStatus = 'unpaid' | 'partial' | 'paid'
export type PaymentMethod = 'cash' | 'mobile_money' | 'bank_transfer' | 'other'
export type SaleStatus = 'completed' | 'voided'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile money',
  bank_transfer: 'Bank transfer',
  other: 'Other',
}

export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]

export interface SaleSummary {
  id: number
  reference: string
  sale_date: string
  customer_name: string | null
  item_count: number
  total: number
  amount_paid: number
  balance_due: number
  payment_status: PaymentStatus
  status: SaleStatus
  created_at: string
}

export interface SaleItem {
  id: number
  product_id: number
  product_name: string
  product_unit: string
  quantity: number
  unit_price: number
  discount: number
  line_total: number
  unit_cost: number
}

export interface Payment {
  id: number
  sale_id: number | null
  purchase_id: number | null
  amount: number
  method: PaymentMethod
  payment_date: string
  reference: string | null
  notes: string | null
  created_at: string
}

export interface SaleDetail extends SaleSummary {
  subtotal: number
  discount: number
  gross_profit: number
  void_reason: string | null
  notes: string | null
  items: SaleItem[]
  payments: Payment[]
}

export interface SaleCreateInput {
  sale_date: string
  customer_name: string | null
  items: { product_id: number; quantity: number; unit_price: number; discount: number }[]
  discount: number
  notes: string | null
  payment: { amount: number; method: PaymentMethod; reference: string | null } | null
}

export interface PaymentInput {
  amount: number
  method: PaymentMethod
  payment_date: string
  reference: string | null
  notes: string | null
}

export interface SaleFilters {
  search?: string
  date_from?: string
  date_to?: string
  status?: SaleStatus
  payment_status?: PaymentStatus
  outstanding?: boolean
  page?: number
  page_size?: number
}
