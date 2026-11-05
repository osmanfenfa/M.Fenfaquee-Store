import { useEffect } from 'react'
import { Printer } from 'lucide-react'
import { useParams } from 'react-router'
import Button from '@/components/ui/Button'
import { useSale, useShopSettings } from '@/hooks/useSales'
import { formatCurrency, formatQuantity } from '@/lib/formatCurrency'
import { formatDate, toISODate } from '@/lib/formatDate'
import { PAYMENT_METHOD_LABELS } from '@/types/sales'

/**
 * Printable receipt (opens in a new tab). Narrow layout that prints well on
 * A5/A4 and on 80mm thermal printers; "Save as PDF" works from the print dialog.
 */
export default function SaleReceipt() {
  const id = Number(useParams().id)
  const { data: sale, isError, error } = useSale(id)
  const { data: shop } = useShopSettings()

  useEffect(() => {
    if (sale) document.title = `Receipt ${sale.reference}`
  }, [sale])

  if (isError) return <p className="p-8 text-center text-sm text-red-700">{error.message}</p>
  if (!sale || !shop) return <p className="p-8 text-center text-sm text-ink-400">Preparing receipt…</p>

  const lineDiscounts = sale.items.reduce((a, i) => a + i.discount, 0)
  const createdAt = new Date(sale.created_at)

  return (
    <div className="min-h-svh bg-stone-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-sm justify-end gap-2 px-4 print:hidden">
        <Button variant="secondary" onClick={() => window.close()}>
          Close
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" /> Print
        </Button>
      </div>

      <article className="tabular mx-auto max-w-sm bg-white px-6 py-7 text-[13px] leading-relaxed text-black shadow-sm print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="text-center">
          <h1 className="text-base font-bold tracking-wide uppercase">{shop.shop_name}</h1>
          {shop.address && <p className="whitespace-pre-line">{shop.address}</p>}
          {shop.phone && <p>Tel: {shop.phone}</p>}
        </header>

        <div className="my-3 border-t border-dashed border-black/60" />

        <dl className="grid grid-cols-[auto_1fr] gap-x-3">
          <dt>Receipt</dt>
          <dd className="text-right font-semibold">{sale.reference}</dd>
          <dt>Date</dt>
          <dd className="text-right">
            {formatDate(sale.sale_date)}
            {sale.sale_date === toISODate(createdAt) &&
              `, ${createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
          </dd>
          {sale.customer_name && (
            <>
              <dt>Customer</dt>
              <dd className="text-right">{sale.customer_name}</dd>
            </>
          )}
        </dl>

        {sale.status === 'voided' && (
          <p className="mt-3 border border-black py-1 text-center font-bold tracking-widest">*** VOIDED ***</p>
        )}

        <div className="my-3 border-t border-dashed border-black/60" />

        <table className="w-full">
          <thead>
            <tr className="text-left text-[11px] uppercase">
              <th className="pb-1 font-semibold">Item</th>
              <th className="pb-1 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((i) => (
              <tr key={i.id} className="align-top">
                <td className="py-1 pr-2">
                  <p className="font-medium">{i.product_name}</p>
                  <p className="text-[12px]">
                    {formatQuantity(i.quantity)} {i.product_unit} × {formatCurrency(i.unit_price)}
                  </p>
                  {i.discount > 0 && <p className="text-[12px]">Discount −{formatCurrency(i.discount)}</p>}
                </td>
                <td className="py-1 text-right whitespace-nowrap">{formatCurrency(i.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="my-3 border-t border-dashed border-black/60" />

        <dl className="grid grid-cols-[1fr_auto] gap-x-3">
          <dt>Subtotal</dt>
          <dd className="text-right">{formatCurrency(sale.subtotal)}</dd>
          {sale.discount > 0 && (
            <>
              <dt>Discount</dt>
              <dd className="text-right">−{formatCurrency(sale.discount)}</dd>
            </>
          )}
          <dt className="mt-1 text-base font-bold">TOTAL</dt>
          <dd className="mt-1 text-right text-base font-bold">{formatCurrency(sale.total)}</dd>
          {sale.payments.map((p) => (
            <div key={p.id} className="contents">
              <dt>
                Paid ({PAYMENT_METHOD_LABELS[p.method]}
                {p.payment_date !== sale.sale_date && `, ${formatDate(p.payment_date)}`})
              </dt>
              <dd className="text-right">{formatCurrency(p.amount)}</dd>
            </div>
          ))}
          {sale.status === 'completed' && sale.balance_due > 0 && (
            <>
              <dt className="font-semibold">Balance due</dt>
              <dd className="text-right font-semibold">{formatCurrency(sale.balance_due)}</dd>
            </>
          )}
        </dl>

        {lineDiscounts + sale.discount > 0 && (
          <p className="mt-2 text-center text-[12px]">You saved {formatCurrency(lineDiscounts + sale.discount)}</p>
        )}

        {shop.receipt_note && (
          <>
            <div className="my-3 border-t border-dashed border-black/60" />
            <p className="text-center font-medium">{shop.receipt_note}</p>
          </>
        )}
      </article>
    </div>
  )
}
