import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const inputClass =
  'w-full rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-ink-900 transition outline-none ' +
  'placeholder:text-ink-300 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/20 ' +
  'disabled:bg-stone-50 disabled:text-ink-400 aria-invalid:border-red-400 aria-invalid:ring-red-500/15'

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string
  required?: boolean
  className?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId()
  const msgId = `${id}-msg`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 ml-3 block text-xs font-medium tracking-wide text-ink-500 uppercase">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {children(id, hint || error ? msgId : undefined)}
      {error ? (
        <p id={msgId} className="mt-1 ml-3 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="mt-1 ml-3 text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(inputClass, className)} {...rest} />
})

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputClass, 'pr-8', className)} {...rest}>
      {children}
    </select>
  )
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, 'min-h-20 rounded-2xl', className)} {...rest} />
}

/** Number input with a fixed prefix, e.g. "NLe". */
export function PrefixedInput({
  prefix,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { prefix: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-xs font-medium text-ink-400">
        {prefix}
      </span>
      <input className={cn(inputClass, 'tabular pl-12', className)} {...rest} />
    </div>
  )
}
