import type { PaymentMethod } from './sales'

export interface ExpenseCategory {
  id: number
  name: string
  expense_count: number
}

export interface Expense {
  id: number
  category_id: number
  category_name: string
  expense_date: string
  amount: number
  description: string
  payment_method: PaymentMethod
  reference: string | null
  notes: string | null
  created_at: string
}

export interface ExpenseInput {
  category_id: number
  expense_date: string
  amount: number
  description: string
  payment_method: PaymentMethod
  reference: string | null
  notes: string | null
}

export interface ExpenseSummary {
  date_from: string
  date_to: string
  total: number
  count: number
  by_category: { category_id: number; category_name: string; total: number; count: number }[]
}

export interface ExpenseFilters {
  search?: string
  category_id?: number
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}
