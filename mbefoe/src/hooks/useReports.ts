import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { reportService } from '@/services/reportService'
import type { ReportType } from '@/types/report'

export function useReport(type: ReportType, dateFrom?: string, dateTo?: string, enabled = true) {
  return useQuery({
    queryKey: ['report', type, dateFrom, dateTo],
    queryFn: ({ signal }) => reportService.preview(type, { date_from: dateFrom, date_to: dateTo }, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}
