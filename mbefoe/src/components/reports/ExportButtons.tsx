import { useState } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/services/api'
import { reportService } from '@/services/reportService'
import type { ReportType } from '@/types/report'

export default function ExportButtons({ type, dateFrom, dateTo, disabled }: { type: ReportType; dateFrom?: string; dateTo?: string; disabled?: boolean }) {
  const toast = useToast()
  const [busy, setBusy] = useState<'pdf' | 'excel' | null>(null)

  async function run(kind: 'pdf' | 'excel') {
    setBusy(kind)
    try {
      const range = { date_from: dateFrom, date_to: dateTo }
      await (kind === 'pdf' ? reportService.downloadPdf(type, range) : reportService.downloadExcel(type, range))
    } catch (e) {
      toast.error(`Couldn't download the ${kind === 'pdf' ? 'PDF' : 'Excel file'}: ${e instanceof ApiError ? e.message : (e as Error)?.message || 'unknown error'}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => run('excel')} loading={busy === 'excel'} disabled={disabled || busy !== null}>
        <FileSpreadsheet className="size-4" /> Excel
      </Button>
      <Button onClick={() => run('pdf')} loading={busy === 'pdf'} disabled={disabled || busy !== null}>
        <FileText className="size-4" /> PDF
      </Button>
    </div>
  )
}
