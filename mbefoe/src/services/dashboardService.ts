import type { Dashboard } from '@/types/dashboard'
import { api } from './api'

export const dashboardService = {
  get: (dateFrom: string, dateTo: string, signal?: AbortSignal) =>
    api.get<Dashboard>('/dashboard', { date_from: dateFrom, date_to: dateTo }, signal),
}
