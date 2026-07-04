import Link from 'next/link'
import { cn } from '@/lib/utils'

export function GroupsEventsTabs({ active }: { active: 'groups' | 'discover' }) {
  return (
    <div className="flex gap-1 px-4 pt-3">
      <Link
        href="/groups"
        className={cn(
          'flex-1 text-center text-sm font-medium py-2 rounded-xl transition-colors',
          active === 'groups' ? 'bg-primary-500/15 text-primary-400' : 'text-slate-500 hover:text-slate-300',
        )}
      >
        Meus grupos
      </Link>
      <Link
        href="/eventos/descobrir"
        className={cn(
          'flex-1 text-center text-sm font-medium py-2 rounded-xl transition-colors',
          active === 'discover' ? 'bg-primary-500/15 text-primary-400' : 'text-slate-500 hover:text-slate-300',
        )}
      >
        Eventos avulsos
      </Link>
    </div>
  )
}
