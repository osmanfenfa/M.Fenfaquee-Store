import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import PageHeader from '@/components/layout/PageHeader'
import SaleForm from '@/components/sales/SaleForm'

export default function NewSale() {
  return (
    <>
      <Link to="/sales" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
        <ArrowLeft className="size-4" /> Sales
      </Link>
      <PageHeader title="Record a sale" />
      <SaleForm />
    </>
  )
}
