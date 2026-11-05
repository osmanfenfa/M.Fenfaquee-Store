import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import PurchaseDetails from '@/components/purchases/PurchaseDetails'
import { usePurchase } from '@/hooks/usePurchases'

export default function PurchaseDetail() {
  const id = Number(useParams().id)
  const { data: purchase, isPending, isError, error } = usePurchase(id)

  return (
    <>
      <Link to="/purchases" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
        <ArrowLeft className="size-4" /> Purchases
      </Link>
      {isError ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error.message}</p>
      ) : isPending ? (
        <div className="h-64 animate-pulse rounded-2xl bg-stone-200/70" />
      ) : (
        <PurchaseDetails purchase={purchase} />
      )}
    </>
  )
}
