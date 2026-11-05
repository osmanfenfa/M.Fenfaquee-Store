import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryService, type AdjustmentInput, type MovementFilters } from '@/services/inventoryService'

export function useInventorySummary() {
  return useQuery({ queryKey: ['inventory', 'summary'], queryFn: inventoryService.summary })
}

export function useLowStock() {
  return useQuery({ queryKey: ['inventory', 'low-stock'], queryFn: inventoryService.lowStock })
}

export function useMovements(filters: MovementFilters) {
  return useQuery({
    queryKey: ['inventory', 'movements', filters],
    queryFn: ({ signal }) => inventoryService.movements(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useAdjustStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AdjustmentInput) => inventoryService.adjust(data),
    onSuccess: () => {
      for (const key of ['inventory', 'products', 'product', 'dashboard']) qc.invalidateQueries({ queryKey: [key] })
    },
  })
}
