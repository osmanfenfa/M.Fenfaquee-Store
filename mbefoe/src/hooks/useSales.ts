import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { salesService } from '@/services/salesService'
import { settingsService } from '@/services/settingsService'
import type { PaymentInput, SaleCreateInput, SaleFilters } from '@/types/sales'

/** A sale touches stock, money owed and dashboard figures — refresh all of them. */
function useInvalidateAfterSale() {
  const qc = useQueryClient()
  return () => {
    for (const key of ['sales', 'sale', 'products', 'product', 'dashboard', 'inventory']) {
      qc.invalidateQueries({ queryKey: [key] })
    }
  }
}

export function useSales(filters: SaleFilters) {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: ({ signal }) => salesService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useSale(id: number | null) {
  return useQuery({
    queryKey: ['sale', id],
    queryFn: () => salesService.get(id!),
    enabled: id !== null && !Number.isNaN(id),
  })
}

export function useCreateSale() {
  const invalidate = useInvalidateAfterSale()
  return useMutation({ mutationFn: (data: SaleCreateInput) => salesService.create(data), onSuccess: invalidate })
}

export function useAddSalePayment() {
  const invalidate = useInvalidateAfterSale()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PaymentInput }) => salesService.addPayment(id, data),
    onSuccess: invalidate,
  })
}

export function useVoidSale() {
  const invalidate = useInvalidateAfterSale()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => salesService.void(id, reason),
    onSuccess: invalidate,
  })
}

export function useShopSettings() {
  return useQuery({ queryKey: ['settings', 'shop'], queryFn: settingsService.getShop, staleTime: 10 * 60_000 })
}
