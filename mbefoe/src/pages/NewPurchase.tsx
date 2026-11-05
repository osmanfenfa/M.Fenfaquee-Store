import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import PageHeader from '@/components/layout/PageHeader'
import PurchaseForm from '@/components/purchases/PurchaseForm'

export default function NewPurchase() {
  return (
    <>
      <Link to="/purchases" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
        <ArrowLeft className="size-4" /> Purchases
      </Link>
      <PageHeader title="Record a purchase" />
      <PurchaseForm />
    </>
  )
}
