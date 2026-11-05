import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import SaleDetails from '@/components/sales/SaleDetails'
import { useSale } from '@/hooks/useSales'

export default function SaleDetail() {
  const id = Number(useParams().id)
  const { data: sale, isPending, isError, error } = useSale(id)

  return (
    <>
      <Link to="/sales" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
        <ArrowLeft className="size-4" /> Sales
      </Link>
      {isError ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error.message}</p>
      ) : isPending ? (
        <div className="h-64 animate-pulse rounded-2xl bg-stone-200/70" />
      ) : (
        <SaleDetails sale={sale} />
      )}
    </>
  )
}
