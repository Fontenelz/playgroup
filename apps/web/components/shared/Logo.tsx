import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

const markSizes = { sm: 28, md: 36, lg: 48 }
const textSizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }

/** Marca do PlayGroup: 3 pontos verdes (o grupo) + 1 laranja (a bola). */
export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const mark = markSizes[size]
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 64 64" width={mark} height={mark} role="img" aria-label="PlayGroup" className="flex-shrink-0">
        <rect width="64" height="64" rx="16" fill="#14191C" />
        <circle cx="22" cy="42" r="9" fill="var(--color-primary-500)" />
        <circle cx="42" cy="42" r="9" fill="var(--color-primary-500)" fillOpacity="0.55" />
        <circle cx="32" cy="26" r="8" fill="var(--color-primary-500)" fillOpacity="0.82" />
        <circle cx="46" cy="18" r="5.5" fill="#f97316" />
      </svg>
      {showText && (
        <span className={cn('font-bold tracking-tight', textSizes[size])}>
          <span className="text-slate-50">Play</span>
          <span className="text-primary-500">Group</span>
        </span>
      )}
    </div>
  )
}
