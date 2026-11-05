import type { Expense, ExpenseCategory, ExpenseFilters, ExpenseInput, ExpenseSummary } from '@/types/expense'
import type { Page } from '@/types/product'
import { api } from './api'

export const expenseService = {
  list: (filters: ExpenseFilters, signal?: AbortSignal) => api.get<Page<Expense>>('/expenses', { ...filters }, signal),
  summary: (date_from?: string, date_to?: string) => api.get<ExpenseSummary>('/expenses/summary', { date_from, date_to }),
  create: (data: ExpenseInput) => api.post<Expense>('/expenses', data),
  update: (id: number, data: Partial<ExpenseInput>) => api.patch<Expense>(`/expenses/${id}`, data),
  remove: (id: number) => api.delete(`/expenses/${id}`),

  categories: () => api.get<ExpenseCategory[]>('/expenses/categories'),
  createCategory: (name: string) => api.post<ExpenseCategory>('/expenses/categories', { name }),
  renameCategory: (id: number, name: string) => api.patch<ExpenseCategory>(`/expenses/categories/${id}`, { name }),
  deleteCategory: (id: number) => api.delete(`/expenses/categories/${id}`),
}
