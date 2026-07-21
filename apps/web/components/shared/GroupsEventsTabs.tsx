import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export function GroupsEventsTabs({ active }: { active: 'groups' | 'discover' }) {
  return (
    <Card className="flex gap-1 p-1 mx-4 mt-3 rounded-xl">
      <Link
        href="/groups"
        className={cn(
          'flex-1 text-center text-sm font-medium py-2 rounded-lg transition-colors',
          active === 'groups'
            ? 'bg-primary-500/15 border border-primary-500/50 text-primary-400'
            : 'text-slate-500 hover:text-slate-300',
        )}
      >
        Meus grupos
      </Link>
      <Link
        href="/eventos/descobrir"
        className={cn(
          'flex-1 text-center text-sm font-medium py-2 rounded-lg transition-colors',
          active === 'discover'
            ? 'bg-primary-500/15 border border-primary-500/50 text-primary-400'
            : 'text-slate-500 hover:text-slate-300',
        )}
      >
        Eventos avulsos
      </Link>
    </Card>
  )
}
