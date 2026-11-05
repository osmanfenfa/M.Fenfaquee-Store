export type MovementType = 'opening' | 'purchase' | 'sale' | 'sale_void' | 'purchase_cancel' | 'adjustment'

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  opening: 'Opening stock',
  purchase: 'Purchase',
  sale: 'Sale',
  sale_void: 'Sale voided',
  purchase_cancel: 'Purchase cancelled',
  adjustment: 'Adjustment',
}

export interface StockMovement {
  id: number
  product_id: number
  product_name: string
  product_unit: string
  movement_type: MovementType
  quantity_change: number
  quantity_after: number
  unit_cost: number | null
  sale_id: number | null
  purchase_id: number | null
  reason: string | null
  created_at: string
}
