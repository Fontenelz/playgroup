'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { updateMemberRole } from '@/lib/actions/groups'
import { cn } from '@/lib/utils'

export interface SettingsMember {
  id: string
  role: string
  user_id: string
  user: { id: string; name: string; nickname: string | null; avatar_url?: string | null }
}

interface SettingsClientProps {
  groupId: string
  groupName: string
  groupAdminId: string
  members: SettingsMember[]
}

export default function SettingsClient({ groupId, groupName, groupAdminId, members }: SettingsClientProps) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function handleChangeRole(member: SettingsMember, role: 'organizer' | 'participant') {
    if (member.role === role) return
    setPendingId(member.id)
    const result = await updateMemberRole(groupId, member.user_id, role)
    setPendingId(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Papel atualizado.')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="Configurações" />

      <div className="px-4 pb-8 pt-1 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">{groupName}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organizadores podem criar eventos e gerenciar participantes. O criador do grupo não pode ser alterado aqui.
          </p>
        </div>

        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Papéis dos membros
          </p>
          <Card className="p-0 overflow-hidden">
            {members.map((m, i) => {
              const isOwner = m.user_id === groupAdminId
              const nickname = m.user.nickname ?? m.user.name.split(' ')[0]

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-slate-800')}
                >
                  <Avatar name={m.user.name} src={m.user.avatar_url ?? undefined} size="sm" />
                  <p className="flex-1 min-w-0 text-sm font-medium text-slate-200 truncate">{nickname}</p>

                  {isOwner ? (
                    <Badge variant="primary" size="sm">⭐ Criador</Badge>
                  ) : (
                    <div className="flex gap-1 rounded-lg bg-slate-800 p-1 flex-shrink-0">
                      <button
                        onClick={() => handleChangeRole(m, 'participant')}
                        disabled={pendingId === m.id}
                        className={cn(
                          'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50',
                          m.role === 'participant'
                            ? 'bg-slate-700 text-slate-100'
                            : 'text-slate-500 hover:text-slate-300',
                        )}
                      >
                        Membro
                      </button>
                      <button
                        onClick={() => handleChangeRole(m, 'organizer')}
                        disabled={pendingId === m.id}
                        className={cn(
                          'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50',
                          m.role === 'organizer'
                            ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                            : 'text-slate-500 hover:text-slate-300',
                        )}
                      >
                        Organizador
                      </button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </Card>
        </section>
      </div>
    </div>
  )
}
