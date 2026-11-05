import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboardService'

export function useDashboard(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['dashboard', dateFrom, dateTo],
    queryFn: ({ signal }) => dashboardService.get(dateFrom, dateTo, signal),
    placeholderData: keepPreviousData, // keep showing old numbers while switching period
    refetchInterval: 60_000,
  })
}
