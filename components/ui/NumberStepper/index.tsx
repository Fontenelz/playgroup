'use client'

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumberStepperProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  hint?: string
  className?: string
}

export function NumberStepper({
  value, onChange, min = 0, max = 999, step = 1,
  label, hint, className,
}: NumberStepperProps) {
  const dec = () => onChange(Math.max(min, value - step))
  const inc = () => onChange(Math.min(max, value + step))

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <p className="text-sm font-medium text-slate-300">{label}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          className="size-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
        >
          <Minus className="size-4" />
        </button>
        <div className="flex-1 h-11 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center">
          <span className="text-lg font-bold text-slate-100">{value}</span>
        </div>
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          className="size-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="size-4" />
        </button>
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
