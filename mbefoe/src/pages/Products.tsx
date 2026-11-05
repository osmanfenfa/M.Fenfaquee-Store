import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useSearchParams } from 'react-router'
import PageHeader from '@/components/layout/PageHeader'
import ProductDetails from '@/components/products/ProductDetails'
import ProductFilters, { type FilterState } from '@/components/products/ProductFilters'
import ProductForm from '@/components/products/ProductForm'
import ProductTable from '@/components/products/ProductTable'
import Button from '@/components/ui/Button'
import Pagination from '@/components/ui/Pagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useCategories, useProducts } from '@/hooks/useProducts'
import type { Product, ProductSort } from '@/types/product'

const PAGE_SIZE = 25

/** Filters live in the URL so Back/Forward and refresh keep your place. */
function useFilterParams() {
  const [params, setParams] = useSearchParams()
  const filters: FilterState = {
    search: params.get('q') ?? '',
    categoryId: params.get('category') ?? '',
    stock: params.get('stock') === 'low' ? 'low' : 'all',
    archived: params.get('archived') === '1',
    sort: (params.get('sort') as ProductSort) || 'name',
  }
  const page = Math.max(1, Number(params.get('page')) || 1)

  function update(patch: Partial<FilterState>, nextPage = 1) {
    const f = { ...filters, ...patch }
    const next = new URLSearchParams()
    if (f.search) next.set('q', f.search)
    if (f.categoryId) next.set('category', f.categoryId)
    if (f.stock === 'low') next.set('stock', 'low')
    if (f.archived) next.set('archived', '1')
    if (f.sort !== 'name') next.set('sort', f.sort)
    if (nextPage > 1) next.set('page', String(nextPage))
    setParams(next, { replace: 'search' in patch }) // typing shouldn't flood history
  }

  return { filters, page, update, setPage: (p: number) => update({}, p) }
}

export default function Products() {
  const { filters, page, update, setPage } = useFilterParams()
  const [searchInput, setSearchInput] = useState(filters.search)
  const search = useDebounce(searchInput, 300)

  // Push the debounced search into the URL
  useEffect(() => {
    if (search !== filters.search) update({ search })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const { data: categories = [] } = useCategories()
  const { data, isPending, isFetching, isError, error } = useProducts({
    search: filters.search || undefined,
    category_id: filters.categoryId ? Number(filters.categoryId) : undefined,
    low_stock: filters.stock === 'low' || undefined,
    is_active: !filters.archived,
    sort: filters.sort,
    page,
    page_size: PAGE_SIZE,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const anyFilter = filters.search || filters.categoryId || filters.stock === 'low'
  const emptyMessage = filters.archived
    ? 'No archived products'
    : anyFilter
      ? 'No products match these filters'
      : 'No products yet — add your first one'

  return (
    <>
      <PageHeader
        title="Products"
        description={data ? `${data.total.toLocaleString()} ${filters.archived ? 'archived' : 'active'} product${data.total === 1 ? '' : 's'}` : 'Your product list, prices and stock levels.'}
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" /> Add product
          </Button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs">
        <ProductFilters
          value={{ ...filters, search: searchInput }}
          onChange={(patch) => ('search' in patch ? setSearchInput(patch.search ?? '') : update(patch))}
          categories={categories}
        />

        {isError ? (
          <p className="p-6 text-center text-sm text-red-700">{error.message}</p>
        ) : isPending ? (
          <div className="space-y-2 p-4" aria-label="Loading products">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-stone-100" />
            ))}
          </div>
        ) : (
          <>
            <ProductTable
              products={data.items}
              loading={isFetching}
              onSelect={(p) => setSelectedId(p.id)}
              emptyMessage={emptyMessage}
            />
            <Pagination page={data.page} pages={data.pages} total={data.total} pageSize={data.page_size} onChange={setPage} noun="products" />
          </>
        )}
      </div>

      <ProductDetails
        productId={selectedId}
        onClose={() => setSelectedId(null)}
        onEdit={(p) => {
          setEditing(p)
          setFormOpen(true)
        }}
      />
      <ProductForm open={formOpen} product={editing} onClose={() => setFormOpen(false)} />
    </>
  )
}
