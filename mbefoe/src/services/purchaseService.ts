import type { Page } from '@/types/product'
import type { PurchaseCreateInput, PurchaseDetail, PurchaseFilters, PurchaseSummary } from '@/types/purchase'
import type { PaymentInput } from '@/types/sales'
import { api } from './api'

export const purchaseService = {
  list: (filters: PurchaseFilters, signal?: AbortSignal) => api.get<Page<PurchaseSummary>>('/purchases', { ...filters }, signal),
  get: (id: number) => api.get<PurchaseDetail>(`/purchases/${id}`),
  create: (data: PurchaseCreateInput) => api.post<PurchaseDetail>('/purchases', data),
  receive: (id: number) => api.post<PurchaseDetail>(`/purchases/${id}/receive`),
  addPayment: (id: number, data: PaymentInput) => api.post<PurchaseDetail>(`/purchases/${id}/payments`, data),
  cancel: (id: number, reason: string) => api.post<PurchaseDetail>(`/purchases/${id}/cancel`, { reason }),
}
