import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepBarProps {
  current: number
  total: number
  labels?: string[]
}

export function StepBar({ current, total, labels }: StepBarProps) {
  return (
    <div className="flex items-center gap-0">
      {Array.from({ length: total }).map((_, i) => {
        const done    = i + 1 < current
        const active  = i + 1 === current

        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'size-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 text-xs font-bold flex-shrink-0',
                done   ? 'border-primary-500 bg-primary-500 text-white'
                       : active ? 'border-primary-500 bg-slate-900 text-primary-400'
                       : 'border-slate-700 bg-slate-900 text-slate-600',
              )}>
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </div>
              {labels?.[i] && (
                <span className={cn(
                  'text-[10px] font-medium whitespace-nowrap',
                  active ? 'text-primary-400' : done ? 'text-slate-400' : 'text-slate-600',
                )}>
                  {labels[i]}
                </span>
              )}
            </div>

            {/* Connector */}
            {i < total - 1 && (
              <div className="flex-1 h-0.5 mx-1 bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full bg-primary-500"
                  initial={{ width: 0 }}
                  animate={{ width: done ? '100%' : '0%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
