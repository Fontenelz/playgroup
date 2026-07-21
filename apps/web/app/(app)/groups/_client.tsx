'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, HelpCircle, Search, Plus, Flame, ChevronRight } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { HeaderIconButton } from '@/components/layout/HeaderIconButton'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { getInitials, cn } from '@/lib/utils'

export interface SquadItem {
  id: string
  name: string
  sport: string
  max_members: number
  member_count: number
  role: 'admin' | 'organizer' | 'participant'
}

const roleLabel = { admin: 'Admin', organizer: 'Organizador', participant: 'Membro' } as const

// Port literal de exact-replication-dev/src/routes/_app.squads.tsx (Vite/TanStack → Next).
export function SquadsClient({ groups }: { groups: SquadItem[] }) {
  const router = useRouter()
  const [code, setCode] = useState('')

  function handleJoin() {
    const trimmed = code.trim()
    if (!trimmed) return
    router.push(`/join/${encodeURIComponent(trimmed)}`)
  }

  const adminCount = groups.filter((g) => g.role === 'admin').length
  const totalMembers = groups.reduce((sum, g) => sum + g.member_count, 0)

  return (
    <div className="pb-4">
      <ScreenHeader
        icon={<Users className="size-5" />}
        title="Meus Grupos"
        subtitle="Seus times e sessões"
        right={
          <div className="flex items-center gap-2">
            <HeaderIconButton icon={<HelpCircle className="size-4" />} aria-label="Ajuda" />
            <HeaderIconButton href="/descobrir" icon={<Search className="size-4" />} aria-label="Descobrir" />
            <HeaderIconButton href="/create/group" icon={<Plus className="size-4" />} aria-label="Criar grupo" />
          </div>
        }
      />

      <div className="px-5 space-y-4">
        <div className="grid grid-cols-3 rounded-2xl bg-card border border-border">
          <div className="p-4 text-center">
            <div className="text-[11px] uppercase text-muted-foreground tracking-wider">Grupos</div>
            <div className="text-2xl font-bold mt-1 text-card-foreground">{groups.length}</div>
          </div>
          <div className="p-4 text-center border-l border-border">
            <div className="text-[11px] uppercase text-muted-foreground tracking-wider">Admin em</div>
            <div className="text-2xl font-bold mt-1 text-card-foreground">{adminCount}</div>
          </div>
          <div className="p-4 text-center border-l border-border">
            <div className="text-[11px] uppercase text-muted-foreground tracking-wider">Membros</div>
            <div className="text-2xl font-bold mt-1 text-primary">{totalMembers}</div>
          </div>
        </div>

        {groups.length > 0 ? (
          <div>
            <div className="text-[11px] uppercase text-muted-foreground tracking-wider mb-2 text-center">
              MEUS GRUPOS · {groups.length}
            </div>
            <div className="space-y-3">
              {groups.map((group) => {
                const sport = SPORT_MAP[group.sport as SportId]
                return (
                  <Link key={group.id} href={`/groups/${group.id}`}>
                    <div className={cn(
                      'rounded-2xl bg-card border p-4 mb-2',
                      group.role === 'admin' ? 'border-primary/50' : 'border-border',
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 relative">
                          <span className="text-primary-foreground font-black text-xs leading-tight text-center">
                            {getInitials(group.name)}
                          </span>
                          <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px]">
                            {sport?.emoji}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold truncate text-card-foreground">{group.name}</span>
                            {group.role === 'admin' && <Flame className="size-4 text-orange-400" fill="currentColor" />}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            <span className="inline-block rounded bg-secondary px-1.5 py-0.5 mr-1">{sport?.label}</span>
                            · {group.member_count} membro{group.member_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-accent/30 px-2.5 py-1 text-xs text-primary font-medium flex-shrink-0">
                          <span className="size-1.5 rounded-full bg-primary" />
                          {roleLabel[group.role]}
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Você ainda não participa de nenhum grupo.
          </p>
        )}

        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                <circle cx="6" cy="6" r="1.5" /><circle cx="12" cy="6" r="1.5" /><circle cx="18" cy="6" r="1.5" />
                <circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
                <circle cx="6" cy="18" r="1.5" /><circle cx="12" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" />
              </svg>
            </div>
            <div className="font-semibold text-card-foreground">Entrar com código</div>
          </div>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="AB-1234"
              className="flex-1 rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 text-card-foreground"
            />
            <button
              onClick={handleJoin}
              disabled={!code.trim()}
              className="rounded-xl bg-primary text-primary-foreground font-semibold px-6 cursor-pointer disabled:opacity-50"
            >
              Ir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
