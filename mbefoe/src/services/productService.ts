import type { StockMovement } from '@/types/inventory'
import type {
  Category,
  CategoryInput,
  Page,
  Product,
  ProductCreateInput,
  ProductFilters,
  ProductInput,
} from '@/types/product'
import { api } from './api'

export const productService = {
  list: (filters: ProductFilters, signal?: AbortSignal) =>
    api.get<Page<Product>>('/products', { ...filters }, signal),
  get: (id: number) => api.get<Product>(`/products/${id}`),
  create: (data: ProductCreateInput) => api.post<Product>('/products', data),
  update: (id: number, data: Partial<ProductInput> & { is_active?: boolean }) =>
    api.patch<Product>(`/products/${id}`, data),
  archive: (id: number) => api.delete(`/products/${id}`),
  movements: (id: number, page = 1) =>
    api.get<Page<StockMovement>>(`/products/${id}/movements`, { page, page_size: 10 }),
}

export const categoryService = {
  list: () => api.get<Category[]>('/categories'),
  create: (data: CategoryInput) => api.post<Category>('/categories', data),
  update: (id: number, data: Partial<CategoryInput>) => api.patch<Category>(`/categories/${id}`, data),
  remove: (id: number) => api.delete(`/categories/${id}`),
}
