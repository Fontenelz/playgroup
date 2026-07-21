'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { LogOut, ChevronRight, Pencil, User } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
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
      <ScreenHeader
        icon={<User className="size-5" />}
        title="Meu Perfil"
        subtitle="Acompanhe sua jornada e conquistas"
        right={
          <Link href="/profile/edit" className="size-10 flex items-center justify-center rounded-full bg-slate-800 border border-primary-500/40 text-primary-400 hover:border-primary-500/60 transition-colors">
            <Pencil className="size-4" />
          </Link>
        }
      />

      <div className="px-5 py-6 space-y-6">
        {/* Avatar + info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="rounded-full bg-gradient-to-br from-primary-500 to-primary-800 p-1 border-2 border-primary-500">
            <Avatar name={name} src={avatar_url ?? undefined} size="xl" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-100">{name}</h2>
            {nickname && <p className="text-sm text-slate-500">@{nickname}</p>}
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
        <Card className="p-0 grid grid-cols-3 divide-x divide-slate-700">
          {stats.map(({ label, value }) => (
            <div key={label} className="text-center px-2 py-4">
              <p className="text-2xl font-bold text-primary-400">{value}</p>
              <p className="text-[11px] uppercase text-slate-500 tracking-wider leading-tight mt-1">{label}</p>
            </div>
          ))}
        </Card>

        {/* Conquistas */}
        <Card className="space-y-3">
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
        </Card>

        {/* Meus grupos */}
        {groups.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meus grupos</h3>
            {groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card interactive className="flex items-center gap-3 p-3 rounded-xl">
                  <SportIcon sport={group.sport as SportId} size="sm" />
                  <p className="flex-1 text-sm text-slate-200">{group.name}</p>
                  <ChevronRight className="size-4 text-slate-600" />
                </Card>
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
