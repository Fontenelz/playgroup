import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'
  size?: 'sm' | 'md'
  children: React.ReactNode
  className?: string
}

const variants = {
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  error:   'bg-red-500/15 text-red-400 border border-red-500/20',
  info:    'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  neutral: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
  primary: 'bg-primary-500/15 text-primary-400 border border-primary-500/20',
}

const sizes = {
  sm: 'text-[10px] px-2 py-0.5 rounded-md',
  md: 'text-xs px-2.5 py-1 rounded-lg',
}

export function Badge({ variant = 'neutral', size = 'md', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center font-semibold', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}
