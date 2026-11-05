import type { Report, ReportType } from '@/types/report'
import { api, downloadFile } from './api'

interface Range {
  date_from?: string
  date_to?: string
}

export const reportService = {
  preview: (type: ReportType, range: Range, signal?: AbortSignal) => api.get<Report>(`/reports/${type}`, { ...range }, signal),
  downloadPdf: (type: ReportType, range: Range) => downloadFile(`/reports/${type}/pdf`, { ...range }),
  downloadExcel: (type: ReportType, range: Range) => downloadFile(`/reports/${type}/excel`, { ...range }),
}
