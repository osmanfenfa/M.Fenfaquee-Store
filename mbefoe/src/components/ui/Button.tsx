import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-xs',
  secondary: 'border border-stone-300 bg-white text-ink-700 hover:bg-stone-50 shadow-xs',
  ghost: 'text-ink-600 hover:bg-stone-100 hover:text-ink-900',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-xs',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-xs gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
}

/** Button look for links (<Link className={buttonStyles()}>) — avoids nesting <button> in <a>. */
// eslint-disable-next-line react-refresh/only-export-components
export function buttonStyles(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-full font-medium transition',
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonStyles(variant, size, className)}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}
