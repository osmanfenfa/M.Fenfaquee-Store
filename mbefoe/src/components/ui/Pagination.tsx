import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

interface Props {
  page: number
  pages: number
  total: number
  pageSize: number
  onChange: (page: number) => void
  noun?: string
}

export default function Pagination({ page, pages, total, pageSize, onChange, noun = 'items' }: Props) {
  if (total === 0) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  return (
    <nav className="flex items-center justify-between gap-3 border-t border-stone-100 px-4 py-3 text-sm" aria-label="Pagination">
      <p className="tabular text-ink-500">
        {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()} {noun}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="tabular px-2 text-xs text-ink-500">
          {page} / {Math.max(pages, 1)}
        </span>
        <Button variant="ghost" size="sm" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
