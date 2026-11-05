import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Loader2, Search } from 'lucide-react'
import { inputClass } from '@/components/ui/Field'
import { useDebounce } from '@/hooks/useDebounce'
import { useProducts } from '@/hooks/useProducts'
import { formatCurrency, formatQuantity } from '@/lib/formatCurrency'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/product'

interface Props {
  onPick: (p: Product) => void
  /** Product ids already on the sale (shown as "added") */
  addedIds?: Set<number>
  /** Block picking products with no stock (sales) — purchases allow it */
  requireStock?: boolean
  placeholder?: string
}

/**
 * Search-as-you-type product combobox. Type a name or SKU, use ↑/↓ and Enter,
 * or click. Searches the server, so it stays fast with thousands of products.
 */
export default function ProductPicker({ onPick, addedIds, requireStock = true, placeholder = 'Search products by name or SKU…' }: Props) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const search = useDebounce(text.trim(), 200)

  const { data, isFetching } = useProducts({ search: search || undefined, page_size: 8, is_active: true, sort: 'name' })
  const results = open && search ? (data?.items ?? []) : []
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0))

  const selectable = (p: Product) => !requireStock || p.stock_quantity > 0

  function pick(p: Product | undefined) {
    if (!p || !selectable(p)) return
    onPick(p)
    setText('')
    setOpen(false)
    inputRef.current?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault() // never submit the sale form from the search box
      pick(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-activedescendant={results[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined}
        aria-autocomplete="list"
        aria-label="Add product"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cn(inputClass, 'h-11 pr-9 pl-9')}
        autoComplete="off"
      />
      {isFetching && search && (
        <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-ink-400" aria-hidden />
      )}

      {open && search && !isFetching && data && data.items.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-ink-500 shadow-lg">
          No products match “{search}”
        </div>
      )}

      {results.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
          {results.map((p, i) => {
            const ok = selectable(p)
            return (
              <li
                key={p.id}
                id={`${listId}-${p.id}`}
                role="option"
                aria-selected={i === activeIndex}
                aria-disabled={!ok}
                onMouseDown={(e) => e.preventDefault()} // keep focus in the input
                onClick={() => pick(p)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2',
                  ok ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                  i === activeIndex && ok && 'bg-brand-50',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {p.name}
                    {addedIds?.has(p.id) && <span className="ml-2 text-xs font-normal text-brand-700">· added</span>}
                  </p>
                  <p className="truncate text-xs text-ink-400">{[p.sku, p.category_name].filter(Boolean).join(' · ') || ' '}</p>
                </div>
                <div className="text-right">
                  <p className="tabular text-sm text-ink-900">{formatCurrency(p.selling_price)}</p>
                  <p className={cn('tabular text-xs', p.stock_quantity <= 0 ? 'text-red-600' : p.is_low_stock ? 'text-orange-600' : 'text-ink-400')}>
                    {p.stock_quantity <= 0 ? 'Out of stock' : `${formatQuantity(p.stock_quantity)} ${p.unit} left`}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
