'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Plus, Trophy, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/',        icon: Home,   label: 'Home'   },
  { href: '/groups',  icon: Users,  label: 'Grupos' },
  { href: '/create',  icon: Plus,   label: '',       isAction: true },
  { href: '/ranking', icon: Trophy, label: 'Ranking'},
  { href: '/profile', icon: User,   label: 'Perfil' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ href, icon: Icon, label, isAction }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href) && href !== '/create'

          if (isAction) {
            return (
              <Link key={href} href={href} className="flex items-center justify-center">
                <div className="size-12 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30 active:scale-95 transition-transform">
                  <Icon className="size-5 text-white" strokeWidth={2.5} />
                </div>
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors min-w-[52px]',
                active ? 'text-primary-400' : 'text-slate-500 hover:text-slate-400',
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
