import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { purchaseService } from '@/services/purchaseService'
import { supplierService } from '@/services/supplierService'
import type { PurchaseCreateInput, PurchaseFilters } from '@/types/purchase'
import type { PaymentInput } from '@/types/sales'
import type { SupplierInput } from '@/types/supplier'

/** Purchases change stock, cost prices, supplier balances and dashboard figures. */
function useInvalidateAfterPurchase() {
  const qc = useQueryClient()
  return () => {
    for (const key of ['purchases', 'purchase', 'suppliers', 'supplier', 'products', 'product', 'dashboard', 'inventory']) {
      qc.invalidateQueries({ queryKey: [key] })
    }
  }
}

// ---------- purchases ----------

export function usePurchases(filters: PurchaseFilters) {
  return useQuery({
    queryKey: ['purchases', filters],
    queryFn: ({ signal }) => purchaseService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function usePurchase(id: number) {
  return useQuery({ queryKey: ['purchase', id], queryFn: () => purchaseService.get(id), enabled: !Number.isNaN(id) })
}

export function useCreatePurchase() {
  const invalidate = useInvalidateAfterPurchase()
  return useMutation({ mutationFn: (data: PurchaseCreateInput) => purchaseService.create(data), onSuccess: invalidate })
}

export function useReceivePurchase() {
  const invalidate = useInvalidateAfterPurchase()
  return useMutation({ mutationFn: (id: number) => purchaseService.receive(id), onSuccess: invalidate })
}

export function useAddPurchasePayment() {
  const invalidate = useInvalidateAfterPurchase()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PaymentInput }) => purchaseService.addPayment(id, data),
    onSuccess: invalidate,
  })
}

export function useCancelPurchase() {
  const invalidate = useInvalidateAfterPurchase()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => purchaseService.cancel(id, reason),
    onSuccess: invalidate,
  })
}

// ---------- suppliers ----------

export function useSuppliers(params: { search?: string; is_active?: boolean; page?: number; page_size?: number }) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: ({ signal }) => supplierService.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

/** All active suppliers, for pick lists (a single shop has a manageable number). */
export function useSupplierOptions() {
  return useQuery({
    queryKey: ['suppliers', 'options'],
    queryFn: () => supplierService.list({ is_active: true, page_size: 100 }),
    select: (page) => page.items,
    staleTime: 5 * 60_000,
  })
}

export function useSaveSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Partial<SupplierInput> & { is_active?: boolean } }) =>
      id ? supplierService.update(id, data) : supplierService.create(data as SupplierInput),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['purchases'] }) // supplier names on purchases
    },
  })
}

export function useArchiveSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => supplierService.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}
