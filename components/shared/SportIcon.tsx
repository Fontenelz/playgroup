import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { cn } from '@/lib/utils'

const sportBg: Record<string, string> = {
  football:   'bg-emerald-500/20',
  futsal:     'bg-emerald-500/20',
  volleyball: 'bg-blue-500/20',
  beach:      'bg-cyan-500/20',
  tennis:     'bg-amber-500/20',
  basketball: 'bg-orange-500/20',
  kart:       'bg-red-500/20',
  cycling:    'bg-violet-500/20',
  running:    'bg-teal-500/20',
  bbq:        'bg-orange-500/20',
  other:      'bg-slate-500/20',
}

interface SportIconProps {
  sport: SportId
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'size-9 text-lg', md: 'size-12 text-2xl', lg: 'size-16 text-3xl' }

export function SportIcon({ sport, size = 'md', className }: SportIconProps) {
  const s = SPORT_MAP[sport] ?? SPORT_MAP['other']
  return (
    <div className={cn('rounded-xl flex items-center justify-center flex-shrink-0', sizes[size], sportBg[sport] ?? sportBg['other'], className)}>
      <span role="img" aria-label={s.label}>{s.emoji}</span>
    </div>
  )
}
