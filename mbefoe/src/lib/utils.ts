import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combine Tailwind class names conditionally and resolve conflicts.
 * e.g. cn('px-2 py-1', isActive && 'bg-brand-600', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
