import { useState } from 'react'
import { Banknote, Coins, Receipt, RefreshCw, TrendingUp, Wallet } from 'lucide-react'
import BestSellingProducts from '@/components/dashboard/BestSellingProducts'
import BreakdownList from '@/components/dashboard/BreakdownList'
import LowStockTable from '@/components/dashboard/LowStockTable'
import RecentSales from '@/components/dashboard/RecentSales'
import RevenueChart from '@/components/dashboard/RevenueChart'
import SalesChart from '@/components/dashboard/SalesChart'
import SummaryCard from '@/components/dashboard/SummaryCard'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import { useDashboard } from '@/hooks/useDashboard'
import { formatCurrency, percentChange } from '@/lib/formatCurrency'
import { PERIODS, periodRange, previousPeriodLabel, type PeriodKey } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS } from '@/types/sales'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function PeriodPicker({ value, onChange }: { value: PeriodKey; onChange: (k: PeriodKey) => void }) {
  return (
    <div role="radiogroup" aria-label="Period" className="flex overflow-x-auto rounded-full border border-stone-200 bg-white p-0.5">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          role="radio"
          aria-checked={value === p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition',
            value === p.key ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-stone-100',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

function TodayStrip({ today }: { today: { revenue: number; sales_count: number; gross_profit: number; money_received: number } }) {
  const items = [
    { label: "Today's sales", value: formatCurrency(today.revenue), hint: `${today.sales_count} sale${today.sales_count === 1 ? '' : 's'}` },
    { label: 'Profit today', value: formatCurrency(today.gross_profit), hint: 'before expenses' },
    { label: 'Money received today', value: formatCurrency(today.money_received), hint: 'incl. old credit' },
  ]
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-ink-900 px-5 py-4">
      <div className="absolute -top-6 -right-6 size-24 rounded-full border-[6px] border-dashed border-brand-500/15" aria-hidden />
      <div className="absolute right-20 -bottom-5 size-12 rounded-full border-4 border-dashed border-brand-500/10" aria-hidden />
      <dl className="relative grid gap-4 sm:grid-cols-3">
        {items.map((i) => (
          <div key={i.label}>
            <dt className="text-xs text-ink-300">{i.label}</dt>
            <dd className="tabular mt-0.5 text-xl font-semibold text-white">{i.value}</dd>
            <dd className="text-[11px] text-brand-300/80">{i.hint}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function OwedCard({ receivable, payable }: { receivable: { total: number; count: number }; payable: { total: number; count: number } }) {
  return (
    <Card title="Money owed">
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-ink-500">Customers owe you</dt>
          <dd className="tabular mt-1 text-lg font-semibold text-ink-900">{formatCurrency(receivable.total)}</dd>
          <dd className="text-xs text-ink-400">{receivable.count} unpaid sale{receivable.count === 1 ? '' : 's'}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">You owe suppliers</dt>
          <dd className="tabular mt-1 text-lg font-semibold text-ink-900">{formatCurrency(payable.total)}</dd>
          <dd className="text-xs text-ink-400">{payable.count} unpaid purchase{payable.count === 1 ? '' : 's'}</dd>
        </div>
      </dl>
    </Card>
  )
}

function StockValueCard({ cost, retail, products }: { cost: number; retail: number; products: number }) {
  return (
    <Card title="Stock on hand" subtitle={`${products} active product${products === 1 ? '' : 's'}`}>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-ink-500">At cost</dt>
          <dd className="tabular mt-1 text-lg font-semibold text-ink-900">{formatCurrency(cost)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">At selling price</dt>
          <dd className="tabular mt-1 text-lg font-semibold text-ink-900">{formatCurrency(retail)}</dd>
        </div>
      </dl>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse" aria-label="Loading dashboard">
      <div className="mb-6 h-24 rounded-2xl bg-stone-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-stone-200/70" />
        ))}
      </div>
      <div className="mt-6 h-80 rounded-2xl bg-stone-200/70" />
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<PeriodKey>('month')
  const { from, to } = periodRange(period)
  const { data, isPending, isError, error, refetch, isFetching } = useDashboard(from, to)

  const firstName = user?.full_name.split(' ')[0] ?? ''

  return (
    <>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        description="Here's how the shop is doing."
        actions={<PeriodPicker value={period} onChange={setPeriod} />}
      />

      {isPending ? (
        <DashboardSkeleton />
      ) : isError ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-ink-700">Couldn't load the dashboard.</p>
            <p className="text-xs text-ink-500">{error.message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-ink-700 hover:bg-stone-50"
            >
              <RefreshCw className="size-4" /> Try again
            </button>
          </div>
        </Card>
      ) : (
        <div className={cn('transition-opacity', isFetching && 'opacity-70')}>
          <TodayStrip today={data.today} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Revenue"
              icon={Banknote}
              value={formatCurrency(data.financials.revenue)}
              change={percentChange(data.financials.revenue, data.previous_financials.revenue)}
              changeLabel={previousPeriodLabel(period)}
              footnote={`${data.financials.sales_count} sales · avg ${formatCurrency(data.financials.average_sale)}`}
            />
            <SummaryCard
              label="Gross profit"
              icon={TrendingUp}
              value={formatCurrency(data.financials.gross_profit)}
              change={percentChange(data.financials.gross_profit, data.previous_financials.gross_profit)}
              changeLabel={previousPeriodLabel(period)}
              footnote={
                data.financials.gross_margin_pct === null ? 'Sales minus cost of goods' : `${data.financials.gross_margin_pct}% margin`
              }
            />
            <SummaryCard
              label="Expenses"
              icon={Wallet}
              value={formatCurrency(data.financials.expenses)}
              change={percentChange(data.financials.expenses, data.previous_financials.expenses)}
              changeLabel={previousPeriodLabel(period)}
              upIsGood={false}
              footnote="Rent, power, transport…"
            />
            <SummaryCard
              label="Net profit"
              icon={Coins}
              value={formatCurrency(data.financials.net_profit)}
              change={percentChange(data.financials.net_profit, data.previous_financials.net_profit)}
              changeLabel={previousPeriodLabel(period)}
              footnote="Gross profit minus expenses"
            />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <RevenueChart data={data.sales_trend} grouping={data.trend_grouping} />
            </div>
            <div className="flex flex-col gap-4">
              <OwedCard receivable={data.receivables} payable={data.payables} />
              <StockValueCard
                cost={data.inventory.stock_value_cost}
                retail={data.inventory.stock_value_retail}
                products={data.inventory.active_products}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <BestSellingProducts products={data.top_products} />
            <RecentSales sales={data.recent_sales} />
            <LowStockTable items={data.low_stock} totalLow={data.inventory.low_stock_count} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <SalesChart data={data.sales_trend} grouping={data.trend_grouping} />
            </div>
            <BreakdownList
              title="Money received"
              subtitle="Customer payments by method"
              empty="No payments received in this period"
              rows={data.money_in_by_method.map((m) => ({
                key: m.method,
                label: PAYMENT_METHOD_LABELS[m.method],
                amount: m.amount,
              }))}
            />
            <BreakdownList
              title="Expenses by category"
              empty="No expenses in this period"
              rows={data.expenses_by_category.map((c) => ({
                key: c.category_id,
                label: c.category_name,
                amount: c.total,
              }))}
            />
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-xs text-ink-400">
            <Receipt className="size-3.5" aria-hidden />
            Stock purchased in this period: {formatCurrency(data.financials.purchases_total)} · Discounts given:{' '}
            {formatCurrency(data.financials.discounts_given)}
          </p>
        </div>
      )}
    </>
  )
}
