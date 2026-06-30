'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  showBack?: boolean
  backHref?: string
  rightAction?: React.ReactNode
  className?: string
  transparent?: boolean
}

export function Header({ title, showBack, backHref, rightAction, className, transparent }: HeaderProps) {
  const router = useRouter()

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex items-center h-14 px-4 gap-3',
        transparent
          ? 'bg-transparent'
          : 'bg-slate-900/95 backdrop-blur-md border-b border-slate-800/60',
        className,
      )}
    >
      {showBack && (
        backHref ? (
          <Link href={backHref} className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 transition-colors -ml-1">
            <ChevronLeft className="size-5 text-slate-400" />
          </Link>
        ) : (
          <button onClick={() => router.back()} className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 transition-colors -ml-1 cursor-pointer">
            <ChevronLeft className="size-5 text-slate-400" />
          </button>
        )
      )}

      {title && (
        <h1 className="flex-1 text-base font-semibold text-slate-100 truncate">
          {title}
        </h1>
      )}

      {rightAction && <div className="ml-auto">{rightAction}</div>}
    </header>
  )
}
