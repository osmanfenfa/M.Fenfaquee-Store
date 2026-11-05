import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoryService, productService } from '@/services/productService'
import type { CategoryInput, ProductCreateInput, ProductFilters, ProductInput } from '@/types/product'

/** Anything that changes products also changes stock figures on the dashboard/inventory. */
function useInvalidateStock() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['product'] })
    qc.invalidateQueries({ queryKey: ['categories'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: ({ signal }) => productService.list(filters, signal),
    placeholderData: keepPreviousData, // no flicker while typing / paging
  })
}

export function useProduct(id: number | null) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.get(id!),
    enabled: id !== null,
  })
}

export function useProductMovements(id: number | null, page = 1) {
  return useQuery({
    queryKey: ['product', id, 'movements', page],
    queryFn: () => productService.movements(id!, page),
    enabled: id !== null,
    placeholderData: keepPreviousData,
  })
}

export function useCreateProduct() {
  const invalidate = useInvalidateStock()
  return useMutation({
    mutationFn: (data: ProductCreateInput) => productService.create(data),
    onSuccess: invalidate,
  })
}

export function useUpdateProduct() {
  const invalidate = useInvalidateStock()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductInput> & { is_active?: boolean } }) =>
      productService.update(id, data),
    onSuccess: invalidate,
  })
}

export function useArchiveProduct() {
  const invalidate = useInvalidateStock()
  return useMutation({
    mutationFn: (id: number) => productService.archive(id),
    onSuccess: invalidate,
  })
}

// ---------- categories ----------

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: categoryService.list, staleTime: 5 * 60_000 })
}

export function useSaveCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: CategoryInput }) =>
      id ? categoryService.update(id, data) : categoryService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['products'] }) // category names shown on products
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => categoryService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}
