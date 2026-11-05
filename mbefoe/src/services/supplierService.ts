import type { Page } from '@/types/product'
import type { Supplier, SupplierInput } from '@/types/supplier'
import { api } from './api'

export const supplierService = {
  list: (params: { search?: string; is_active?: boolean; page?: number; page_size?: number }, signal?: AbortSignal) =>
    api.get<Page<Supplier>>('/suppliers', params, signal),
  get: (id: number) => api.get<Supplier>(`/suppliers/${id}`),
  create: (data: SupplierInput) => api.post<Supplier>('/suppliers', data),
  update: (id: number, data: Partial<SupplierInput> & { is_active?: boolean }) => api.patch<Supplier>(`/suppliers/${id}`, data),
  archive: (id: number) => api.delete(`/suppliers/${id}`),
}
