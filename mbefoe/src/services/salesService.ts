import type { Page } from '@/types/product'
import type { PaymentInput, SaleCreateInput, SaleDetail, SaleFilters, SaleSummary } from '@/types/sales'
import { api } from './api'

export const salesService = {
  list: (filters: SaleFilters, signal?: AbortSignal) => api.get<Page<SaleSummary>>('/sales', { ...filters }, signal),
  get: (id: number) => api.get<SaleDetail>(`/sales/${id}`),
  create: (data: SaleCreateInput) => api.post<SaleDetail>('/sales', data),
  addPayment: (id: number, data: PaymentInput) => api.post<SaleDetail>(`/sales/${id}/payments`, data),
  void: (id: number, reason: string) => api.post<SaleDetail>(`/sales/${id}/void`, { reason }),
}
