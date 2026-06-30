'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { SportIcon } from '@/components/shared/SportIcon'
import { Badge } from '@/components/ui/Badge'
import { MOCK_GROUPS } from '@/data/mock'

export default function GroupsPage() {
  const adminGroups = MOCK_GROUPS.filter((g) => g.my_role === 'admin')
  const memberGroups = MOCK_GROUPS.filter((g) => g.my_role !== 'admin')

  return (
    <div>
      <Header
        title="Meus Grupos"
        rightAction={
          <div className="flex items-center gap-1">
            <button className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 cursor-pointer">
              <Search className="size-4" />
            </button>
            <Link href="/groups/create" className="size-9 flex items-center justify-center rounded-xl bg-primary-500/10 text-primary-400 hover:bg-primary-500/20">
              <Plus className="size-4" />
            </Link>
          </div>
        }
      />

      <div className="px-4 py-4 space-y-6">
        {adminGroups.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Administrador</p>
            <div className="space-y-3">
              {adminGroups.map((group, i) => (
                <GroupCard key={group.id} group={group} index={i} />
              ))}
            </div>
          </section>
        )}

        {memberGroups.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Participante</p>
            <div className="space-y-3">
              {memberGroups.map((group, i) => (
                <GroupCard key={group.id} group={group} index={i} />
              ))}
            </div>
          </section>
        )}

        <Link href="/groups/create" className="flex items-center gap-3 p-4 border border-dashed border-slate-700 rounded-2xl hover:border-primary-500/50 hover:bg-primary-500/5 transition-all">
          <div className="size-12 rounded-xl bg-slate-800 flex items-center justify-center">
            <Plus className="size-5 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">Criar novo grupo</p>
            <p className="text-xs text-slate-500">Futebol, vôlei, beach tennis...</p>
          </div>
        </Link>

        <button className="w-full text-center text-sm text-primary-400 py-2 hover:underline cursor-pointer">
          Entrar com link de convite
        </button>
      </div>
    </div>
  )
}

function GroupCard({ group, index }: { group: typeof MOCK_GROUPS[0]; index: number }) {
  const roleLabel = { admin: 'Admin', organizer: 'Organizador', participant: 'Membro' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link href={`/groups/${group.id}`}>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 hover:border-slate-700 transition-all active:scale-[0.99]">
          <SportIcon sport={group.sport} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{group.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{group.member_count} membros</p>
          </div>
          {group.my_role && (
            <Badge
              variant={group.my_role === 'admin' ? 'primary' : group.my_role === 'organizer' ? 'warning' : 'neutral'}
              size="sm"
            >
              {roleLabel[group.my_role]}
            </Badge>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
