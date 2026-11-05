import { Hammer } from 'lucide-react'
import Card from '@/components/ui/Card'
import PageHeader from './PageHeader'

/** Temporary page body for modules whose UI hasn't been built yet. */
export default function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Hammer className="size-6 text-brand-600" aria-hidden />
          <p className="text-sm font-medium text-ink-800">This page is being built</p>
          <p className="max-w-sm text-sm text-ink-500">The backend for it is ready; the screen comes next.</p>
        </div>
      </Card>
    </>
  )
}
