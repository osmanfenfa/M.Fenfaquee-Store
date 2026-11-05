import logoUrl from '@/assets/logo.png'
import { cn } from '@/lib/utils'

/**
 * M.Fenfaquee Enterprise logo (leopard "M"). The artwork sits on black,
 * so it's shown inside a black disc that blends with it on any background.
 */
export default function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-black ring-2 ring-white/70', className)}
      style={{ width: size, height: size }}
    >
      <img src={logoUrl} alt="M.Fenfaquee Enterprise logo" className="w-[86%] object-contain" draggable={false} />
    </span>
  )
}
