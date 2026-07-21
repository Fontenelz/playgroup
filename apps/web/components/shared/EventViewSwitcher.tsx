'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const VIEWS = [
  { href: '/descobrir', label: 'Descobrir' },
  { href: '/eventos/fillups', label: 'Fill Ups' },
  { href: '/eventos/solo-kickoffs', label: 'Solo Kickoffs' },
] as const

/** Alterna entre as 3 apresentações visuais do mesmo dado (eventos avulsos públicos). */
export function EventViewSwitcher() {
  const pathname = usePathname()

  return (
    <div className="flex gap-2 px-5 pt-3 overflow-x-auto scrollbar-hide">
      {VIEWS.map(({ href, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors',
              active
                ? 'bg-primary-500/15 border-primary-500/50 text-primary-400'
                : 'bg-slate-900 border-slate-700 text-slate-300',
            )}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
