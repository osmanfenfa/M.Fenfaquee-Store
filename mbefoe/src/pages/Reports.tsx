import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import ExportButtons from '@/components/reports/ExportButtons'
import ReportFilters from '@/components/reports/ReportFilters'
import { REPORTS, type RangeKey } from '@/components/reports/reportCatalog'
import ReportPreview from '@/components/reports/ReportPreview'
import { useReport } from '@/hooks/useReports'
import { periodRange, toISODate } from '@/lib/formatDate'
import type { ReportType } from '@/types/report'

export default function Reports() {
  const [type, setType] = useState<ReportType>('sales')
  const [range, setRange] = useState<RangeKey>('month')
  const today = toISODate(new Date())
  const [customFrom, setCustomFrom] = useState(periodRange('month').from)
  const [customTo, setCustomTo] = useState(today)

  const dated = REPORTS.find((r) => r.type === type)!.dated
  const { from, to } = range === 'custom' ? { from: customFrom, to: customTo } : periodRange(range)
  const validRange = !dated || (!!from && !!to && from <= to)
  const dateFrom = dated ? from : undefined
  const dateTo = dated ? to : undefined

  const { data, isPending, isFetching, isError, error } = useReport(type, dateFrom, dateTo, validRange)

  return (
    <>
      <PageHeader title="Reports" description="Preview on screen, then download as PDF or Excel. All figures come from your recorded transactions." />

      <ReportFilters
        type={type}
        onType={setType}
        range={range}
        onRange={setRange}
        customFrom={customFrom}
        customTo={customTo}
        onCustom={(f, t) => {
          setCustomFrom(f)
          setCustomTo(t)
        }}
      />

      <div className="mt-6 mb-4 flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">{data?.type === type ? data.title : REPORTS.find((r) => r.type === type)!.title}</h2>
          <p className="text-sm text-brand-700">{data?.type === type ? data.period_label : '…'}</p>
        </div>
        <ExportButtons type={type} dateFrom={dateFrom} dateTo={dateTo} disabled={!validRange || isError} />
      </div>

      {!validRange ? (
        <p className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-900">Choose a start date on or before the end date.</p>
      ) : isError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>
      ) : isPending || data.type !== type ? (
        <div className="space-y-3" aria-label="Loading report">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-stone-200/70" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-stone-200/70" />
        </div>
      ) : (
        <ReportPreview report={data} loading={isFetching} />
      )}
    </>
  )
}
