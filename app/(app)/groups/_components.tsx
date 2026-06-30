'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { SportIcon } from '@/components/shared/SportIcon'
import { Badge } from '@/components/ui/Badge'
import type { SportId } from '@/lib/constants'

interface GroupItem {
  id: string
  name: string
  sport: string
  max_members: number
  role: 'admin' | 'organizer' | 'participant'
}

const roleLabel = { admin: 'Admin', organizer: 'Organizador', participant: 'Membro' } as const
const roleBadge = { admin: 'primary', organizer: 'warning', participant: 'neutral' } as const

export function GroupList({ groups }: { groups: GroupItem[] }) {
  return (
    <div className="space-y-3">
      {groups.map((group, i) => (
        <motion.div
          key={group.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <Link href={`/groups/${group.id}`}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 hover:border-slate-700 transition-all active:scale-[0.99]">
              <SportIcon sport={group.sport as SportId} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{group.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">máx. {group.max_members} membros</p>
              </div>
              <Badge variant={roleBadge[group.role]} size="sm">
                {roleLabel[group.role]}
              </Badge>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
