'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { LogOut, Settings, Leaf, Calendar as CalIcon, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { HeaderIconButton } from '@/components/layout/HeaderIconButton'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { SportIcon } from '@/components/shared/SportIcon'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { signOut } from '@/lib/actions/auth'
import { formatDate } from '@/lib/utils'

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
  goals: number
  assists: number
  groupCount: number
  groups: ProfileGroup[]
  memberSince: string
}

function Stat({ v, l, primary }: { v: string | number; l: string; primary?: boolean }) {
  return (
    <div className="text-center px-2 py-3">
      <div className={`text-2xl font-bold ${primary ? 'text-primary' : 'text-card-foreground'}`}>{v}</div>
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider leading-tight mt-1">{l}</div>
    </div>
  )
}

// Port literal de exact-replication-dev/src/routes/_app.profile.tsx (Vite/TanStack → Next).
export default function ProfileClient({
  name, nickname, avatar_url, city, sports, presences, goals, assists, groupCount, groups, memberSince,
}: ProfileClientProps) {
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    toast('Até logo!', { icon: '👋' })
    startTransition(() => signOut())
  }

  return (
    <div className="pb-4">
      <ScreenHeader
        icon={<User className="size-5" />}
        title="Meu Perfil"
        subtitle="Acompanhe sua jornada e conquistas"
        right={
          <HeaderIconButton href="/profile/edit" icon={<Settings className="size-4" />} aria-label="Editar perfil" />
        }
      />

      <div className="px-5 space-y-4">
        <div className="flex flex-col items-center pt-2">
          <div className="size-28 rounded-full bg-gradient-to-br from-primary to-primary-800 p-1 border-2 border-primary">
            <Avatar name={name} src={avatar_url ?? undefined} size="xl" className="size-full" />
          </div>
          <div className="mt-3 text-2xl font-bold text-foreground">{name}</div>
          <div className="text-sm text-muted-foreground">
            {nickname && `@${nickname} · `}Membro desde {formatDate(memberSince, { weekday: undefined, day: undefined, month: 'long', year: 'numeric' })}
          </div>
          {sports.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              {sports.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-accent/30 px-3 py-1 text-xs text-primary font-medium"
                >
                  <Leaf className="size-3" /> {SPORT_MAP[s as SportId]?.label ?? s}
                </span>
              ))}
              {city && (
                <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground">{city}</span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 rounded-2xl bg-card border border-border divide-x divide-border">
          <Stat v={presences} l="Presenças" primary />
          <Stat v={groupCount} l="Grupos" primary />
          <Stat v={goals} l="Gols" primary />
          <Stat v={assists} l="Assistências" primary />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalIcon className="size-4" />
            Membro desde
          </div>
          <div className="font-semibold text-foreground">
            {formatDate(memberSince, { weekday: undefined, day: undefined, month: 'long', year: 'numeric' })}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conquistas</h3>
          {[
            { emoji: '⭐', label: '6 meses seguidos', done: false },
            { emoji: '💰', label: 'Sem atraso em 2025', done: false },
            { emoji: '🏆', label: '50 presenças', done: presences >= 50, progress: presences < 50 ? `${presences}/50` : undefined },
          ].map(({ emoji, label, done, progress }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={done ? '' : 'grayscale opacity-50'}>{emoji}</span>
              <span className={`text-sm flex-1 ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
              {progress && <span className="text-xs text-muted-foreground">{progress}</span>}
              {done && <span className="text-xs text-primary">✓</span>}
            </div>
          ))}
        </div>

        {groups.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] uppercase text-muted-foreground tracking-wider">Meus grupos</div>
            {groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <div className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3 mb-2">
                  <SportIcon sport={group.sport as SportId} size="sm" />
                  <p className="flex-1 text-sm text-foreground">{group.name}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Button variant="danger" fullWidth loading={isPending} onClick={handleLogout} leftIcon={<LogOut className="size-4" />}>
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
