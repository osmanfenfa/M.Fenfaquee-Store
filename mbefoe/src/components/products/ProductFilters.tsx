import { Search, X } from 'lucide-react'
import { inputClass, Select } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import type { Category, ProductSort } from '@/types/product'

export interface FilterState {
  search: string
  categoryId: string // '' = all
  stock: 'all' | 'low'
  archived: boolean
  sort: ProductSort
}

interface Props {
  value: FilterState
  onChange: (patch: Partial<FilterState>) => void
  categories: Category[]
}

export default function ProductFilters({ value, onChange, categories }: Props) {
  return (
    <div className="flex flex-col gap-3 border-b border-stone-100 p-4 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <input
          type="search"
          value={value.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search by name or SKU…"
          aria-label="Search products"
          className={cn(inputClass, 'pl-9')}
        />
        {value.search && (
          <button
            type="button"
            onClick={() => onChange({ search: '' })}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-700"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Select
          aria-label="Category"
          value={value.categoryId}
          onChange={(e) => onChange({ categoryId: e.target.value })}
          className="sm:w-44"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Sort by"
          value={value.sort}
          onChange={(e) => onChange({ sort: e.target.value as ProductSort })}
          className="sm:w-40"
        >
          <option value="name">Name A–Z</option>
          <option value="stock">Lowest stock</option>
          <option value="price_desc">Highest price</option>
          <option value="newest">Newest</option>
        </Select>

        <div className="col-span-2 flex rounded-full border border-stone-300 bg-white p-0.5 text-xs font-medium" role="radiogroup" aria-label="Stock filter">
          {(
            [
              ['all', 'All stock'],
              ['low', 'Low stock'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={value.stock === k}
              onClick={() => onChange({ stock: k })}
              className={cn(
                'flex-1 rounded-full px-3 py-1.5 whitespace-nowrap',
                value.stock === k ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-stone-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="col-span-2 flex cursor-pointer items-center gap-2 text-sm text-ink-600 select-none">
          <input
            type="checkbox"
            checked={value.archived}
            onChange={(e) => onChange({ archived: e.target.checked })}
            className="size-4 rounded border-stone-300 accent-brand-600"
          />
          Show archived
        </label>
      </div>
    </div>
  )
}
