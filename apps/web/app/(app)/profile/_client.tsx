'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { LogOut, ChevronRight, Pencil } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SportIcon } from '@/components/shared/SportIcon'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { useTransition } from 'react'
import { signOut } from '@/lib/actions/auth'
import toast from 'react-hot-toast'

export interface ProfileGroup {
  id: string
  name: string
  sport: string
}

interface ProfileClientProps {
  name: string
  nickname: string | null
  avatar_url?: string | null
  city?: string | null
  sports: string[]
  presences: number
  groupCount: number
  groups: ProfileGroup[]
}

export default function ProfileClient({
  name, nickname, avatar_url, city, sports, presences, groupCount, groups,
}: ProfileClientProps) {
  const [isPending, startTransition] = useTransition()

  const displayNickname = nickname ?? name.split(' ')[0]

  const stats = [
    { label: 'Presenças',   value: presences },
    { label: 'Grupos',      value: groupCount },
    { label: 'Conquistas',  value: '—' },
  ]

  function handleLogout() {
    toast('Até logo!', { icon: '👋' })
    startTransition(() => signOut())
  }

  return (
    <div>
      <Header
        title="Meu Perfil"
        rightAction={
          <Link href="/profile/edit" className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400">
            <Pencil className="size-4" />
          </Link>
        }
      />

      <div className="px-4 py-6 space-y-6">
        {/* Avatar + info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <Avatar name={name} src={avatar_url ?? undefined} size="xl" />
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-100">{name}</h2>
            {city && <p className="text-sm text-slate-400 mt-0.5">{city}</p>}
            <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
              {sports.map((s) => (
                <Badge key={s} variant="primary" size="sm">
                  {SPORT_MAP[s as SportId]?.emoji} {SPORT_MAP[s as SportId]?.label}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-slate-100">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Conquistas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conquistas</h3>
          {[
            { emoji: '⭐', label: '6 meses seguidos', done: false },
            { emoji: '💰', label: 'Sem atraso em 2025', done: false },
            { emoji: '🏆', label: '50 presenças', done: presences >= 50, progress: presences < 50 ? `${presences}/50` : undefined },
          ].map(({ emoji, label, done, progress }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={done ? '' : 'grayscale opacity-50'}>{emoji}</span>
              <span className={`text-sm flex-1 ${done ? 'text-slate-200' : 'text-slate-500'}`}>{label}</span>
              {progress && <span className="text-xs text-slate-500">{progress}</span>}
              {done && <span className="text-xs text-primary-400">✓</span>}
            </div>
          ))}
        </div>

        {/* Meus grupos */}
        {groups.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meus grupos</h3>
            {groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-all">
                  <SportIcon sport={group.sport as SportId} size="sm" />
                  <p className="flex-1 text-sm text-slate-200">{group.name}</p>
                  <ChevronRight className="size-4 text-slate-600" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Logout */}
        <Button variant="danger" fullWidth loading={isPending} onClick={handleLogout} leftIcon={<LogOut className="size-4" />}>
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
