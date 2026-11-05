export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface Category {
  id: number
  name: string
  description: string | null
  product_count: number
  created_at: string
}

export interface CategoryInput {
  name: string
  description?: string | null
}

export interface Product {
  id: number
  name: string
  sku: string | null
  description: string | null
  category_id: number | null
  category_name: string | null
  unit: string
  cost_price: number
  selling_price: number
  stock_quantity: number
  reorder_level: number
  stock_value: number
  is_low_stock: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductInput {
  name: string
  sku: string | null
  description: string | null
  category_id: number | null
  unit: string
  cost_price: number
  selling_price: number
  reorder_level: number
}

export interface ProductCreateInput extends ProductInput {
  opening_stock: number
}

export type ProductSort = 'name' | 'stock' | 'price_desc' | 'newest'

export interface ProductFilters {
  search?: string
  category_id?: number
  low_stock?: boolean
  is_active?: boolean
  sort?: ProductSort
  page?: number
  page_size?: number
}

export const UNIT_SUGGESTIONS = ['piece', 'pack', 'bottle', 'can', 'bag', 'carton', 'box', 'kg', 'g', 'litre', 'metre', 'pair', 'dozen']
