import type { InventorySummary } from '@/types/dashboard'
import type { MovementType, StockMovement } from '@/types/inventory'
import type { Page, Product } from '@/types/product'
import { api } from './api'

export interface AdjustmentInput {
  product_id: number
  reason: string
  quantity_change?: number
  counted_quantity?: number
}

export interface MovementFilters {
  product_id?: number
  movement_type?: MovementType
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}

export const inventoryService = {
  summary: () => api.get<InventorySummary>('/inventory/summary'),
  lowStock: () => api.get<Product[]>('/inventory/low-stock'),
  movements: (filters: MovementFilters, signal?: AbortSignal) => api.get<Page<StockMovement>>('/inventory/movements', { ...filters }, signal),
  adjust: (data: AdjustmentInput) => api.post<StockMovement>('/inventory/adjustments', data),
}
