import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

/** Bloco elevado padrão (bg-slate-900 + borda sutil, sobre o fundo bg-slate-950 do body). */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ interactive, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-slate-900 border border-slate-700 rounded-2xl p-4',
          interactive && 'hover:border-primary-500/40 active:scale-[0.99] transition-all cursor-pointer',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
