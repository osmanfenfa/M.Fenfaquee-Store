import type { PaymentMethod, SaleSummary } from './sales'

export interface Financials {
  revenue: number
  cogs: number
  gross_profit: number
  gross_margin_pct: number | null
  expenses: number
  net_profit: number
  sales_count: number
  average_sale: number
  discounts_given: number
  purchases_total: number
}

export interface TrendPoint {
  period: string
  revenue: number
  gross_profit: number
  sales_count: number
}

export interface TopProduct {
  product_id: number
  name: string
  unit: string
  quantity: number
  revenue: number
  gross_profit: number
}

export interface LowStockItem {
  id: number
  name: string
  unit: string
  stock_quantity: number
  reorder_level: number
}

export interface ExpenseCategoryTotal {
  category_id: number
  category_name: string
  total: number
  count: number
}

export interface InventorySummary {
  active_products: number
  low_stock_count: number
  out_of_stock_count: number
  stock_value_cost: number
  stock_value_retail: number
}

export interface Outstanding {
  total: number
  count: number
}

export interface Dashboard {
  date_from: string
  date_to: string
  trend_grouping: 'day' | 'month'
  financials: Financials
  previous_financials: Financials
  today: { revenue: number; sales_count: number; gross_profit: number; money_received: number }
  money_in_by_method: { method: PaymentMethod; amount: number }[]
  receivables: Outstanding
  payables: Outstanding
  inventory: InventorySummary
  sales_trend: TrendPoint[]
  top_products: TopProduct[]
  expenses_by_category: ExpenseCategoryTotal[]
  low_stock: LowStockItem[]
  recent_sales: SaleSummary[]
}
