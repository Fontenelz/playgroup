import Link from 'next/link'
import { Plus } from 'lucide-react'
import { api } from '@/lib/api/client'
import { Header } from '@/components/layout/Header'
import { GroupsEventsTabs } from '@/components/shared/GroupsEventsTabs'
import { GroupList } from './_components'

interface GroupRow {
  id: string
  name: string
  sport: string
  max_members: number
  role: 'admin' | 'organizer' | 'participant'
}

export default async function GroupsPage() {
  const groups = await api.get<GroupRow[]>('/groups')

  const adminGroups  = groups.filter((g) => g.role === 'admin')
  const memberGroups = groups.filter((g) => g.role !== 'admin')

  return (
    <div>
      <Header
        title="Meus Grupos"
        rightAction={
          <Link
            href="/create/group"
            className="size-9 flex items-center justify-center rounded-xl bg-primary-500/10 text-primary-400 hover:bg-primary-500/20"
          >
            <Plus className="size-4" />
          </Link>
        }
      />

      <GroupsEventsTabs active="groups" />

      <div className="px-4 py-4 space-y-6">
        {groups.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">
            Você ainda não participa de nenhum grupo.
          </p>
        )}

        {adminGroups.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Administrador</p>
            <GroupList groups={adminGroups} />
          </section>
        )}

        {memberGroups.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Participante</p>
            <GroupList groups={memberGroups} />
          </section>
        )}

        <Link href="/create/group" className="flex items-center gap-3 p-4 border border-dashed border-slate-700 rounded-2xl hover:border-primary-500/50 hover:bg-primary-500/5 transition-all">
          <div className="size-12 rounded-xl bg-slate-800 flex items-center justify-center">
            <Plus className="size-5 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">Criar novo grupo</p>
            <p className="text-xs text-slate-500">Futebol, vôlei, beach tennis...</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
