import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { expenseService } from '@/services/expenseService'
import type { ExpenseFilters, ExpenseInput } from '@/types/expense'

function useInvalidateExpenses() {
  const qc = useQueryClient()
  return () => {
    for (const key of ['expenses', 'expense-categories', 'dashboard']) qc.invalidateQueries({ queryKey: [key] })
  }
}

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: ['expenses', 'list', filters],
    queryFn: ({ signal }) => expenseService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useExpenseSummary(from?: string, to?: string) {
  return useQuery({
    queryKey: ['expenses', 'summary', from, to],
    queryFn: () => expenseService.summary(from, to),
    placeholderData: keepPreviousData,
  })
}

export function useExpenseCategories() {
  return useQuery({ queryKey: ['expense-categories'], queryFn: expenseService.categories, staleTime: 5 * 60_000 })
}

export function useSaveExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: ExpenseInput }) => (id ? expenseService.update(id, data) : expenseService.create(data)),
    onSuccess: invalidate,
  })
}

export function useDeleteExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({ mutationFn: (id: number) => expenseService.remove(id), onSuccess: invalidate })
}

export function useSaveExpenseCategory() {
  const invalidate = useInvalidateExpenses()
  return useMutation({
    mutationFn: ({ id, name }: { id?: number; name: string }) =>
      id ? expenseService.renameCategory(id, name) : expenseService.createCategory(name),
    onSuccess: invalidate,
  })
}

export function useDeleteExpenseCategory() {
  const invalidate = useInvalidateExpenses()
  return useMutation({ mutationFn: (id: number) => expenseService.deleteCategory(id), onSuccess: invalidate })
}
