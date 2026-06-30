'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectCardOption<T extends string> {
  id: T
  label: string
  description?: string
  icon?: string
}

interface SelectCardGroupProps<T extends string> {
  options: SelectCardOption<T>[]
  value: T | null
  onChange: (v: T) => void
  columns?: 1 | 2 | 3
}

export function SelectCardGroup<T extends string>({
  options, value, onChange, columns = 1,
}: SelectCardGroupProps<T>) {
  return (
    <div className={cn(
      'grid gap-2',
      columns === 1 && 'grid-cols-1',
      columns === 2 && 'grid-cols-2',
      columns === 3 && 'grid-cols-3',
    )}>
      {options.map(({ id, label, description, icon }) => {
        const selected = value === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98]',
              selected
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-slate-700 bg-slate-900 hover:border-slate-600',
            )}
          >
            {icon && <span className="text-xl leading-none mt-0.5 flex-shrink-0">{icon}</span>}
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold', selected ? 'text-primary-300' : 'text-slate-200')}>
                {label}
              </p>
              {description && (
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>
              )}
            </div>
            {selected && (
              <div className="size-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="size-3 text-white" strokeWidth={3} />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
