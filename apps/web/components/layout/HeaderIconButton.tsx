'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface HeaderIconButtonProps {
  icon: React.ReactNode
  href?: string
  onClick?: () => void
  badge?: number
  className?: string
  'aria-label'?: string
}

/** Botão de ação circular padrão dos headers (busca, compartilhar, configurações, ajuda...). */
export function HeaderIconButton({ icon, href, onClick, badge, className, ...rest }: HeaderIconButtonProps) {
  const classes = cn(
    'relative size-10 flex-shrink-0 flex items-center justify-center rounded-full',
    'bg-secondary border border-primary/40 text-primary',
    'hover:border-primary/60 transition-colors cursor-pointer',
    className,
  )

  const content = (
    <>
      {icon}
      {typeof badge === 'number' && badge > 0 && (
        <span className="absolute -top-1 -right-1 size-4 bg-primary rounded-full text-[10px] font-bold text-primary-foreground flex items-center justify-center">
          {badge}
        </span>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={classes} {...rest}>
      {content}
    </button>
  )
}
