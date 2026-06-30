'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variants = {
  primary:   'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-lg shadow-primary-500/20',
  secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600 active:bg-slate-500',
  ghost:     'bg-transparent text-slate-300 hover:bg-slate-800 active:bg-slate-700',
  danger:    'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30',
  outline:   'bg-transparent border border-slate-600 text-slate-300 hover:bg-slate-800',
}

const sizes = {
  sm: 'h-9 px-4 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-5 text-base rounded-xl gap-2',
  lg: 'h-14 px-6 text-base rounded-2xl gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, leftIcon, rightIcon, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-150',
          'active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
          'select-none cursor-pointer',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'
