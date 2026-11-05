import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  actions?: ReactNode
}

/** Mobile: centred brand-coloured title (as in the sample). Desktop: left-aligned with actions on the right. */
export default function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="mb-5 flex flex-col gap-4 text-center sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:text-left">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-brand-800 sm:text-2xl sm:font-semibold sm:text-ink-900">{title}</h1>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500 sm:mx-0 sm:max-w-none">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  )
}
