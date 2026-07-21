'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Zap, SlidersHorizontal, HelpCircle, Search } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { HeaderIconButton } from '@/components/layout/HeaderIconButton'
import { EventViewSwitcher } from '@/components/shared/EventViewSwitcher'
import { Avatar } from '@/components/ui/Avatar'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { formatDate, formatTime, cn } from '@/lib/utils'
import type { PublicEventCard } from '@/lib/actions/events'

type ViewTab = 'discover' | 'mine'
type QuickFilter = 'all' | 'today' | 'week' | 'open'

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'all',   label: 'Todos' },
  { id: 'today', label: 'Hoje' },
  { id: 'week',  label: 'Essa semana' },
  { id: 'open',  label: 'Com vagas' },
]

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Port literal de exact-replication-dev/src/routes/_app.solo-kickoffs.tsx (Vite/TanStack → Next).
export function SoloKickoffsClient({ events, error }: { events: PublicEventCard[]; error?: string }) {
  const [view, setView] = useState<ViewTab>('discover')
  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')

  const base = view === 'discover' ? events : events.filter((e) => e.myStatus !== null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const now = new Date()
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return base.filter((event) => {
      const matchesSearch =
        !q ||
        event.title.toLowerCase().includes(q) ||
        (event.location_name?.toLowerCase().includes(q) ?? false)

      const starts = new Date(event.starts_at)
      const matchesQuick =
        quickFilter === 'all' ||
        (quickFilter === 'today' && isSameDay(starts, now)) ||
        (quickFilter === 'week' && starts <= endOfWeek) ||
        (quickFilter === 'open' && event.participant_count < event.max_participants)

      return matchesSearch && matchesQuick
    })
  }, [base, search, quickFilter])

  return (
    <div className="pb-4">
      <ScreenHeader
        icon={<Zap className="size-5" fill="currentColor" />}
        title="Solo Kickoffs"
        subtitle="Encontre um jogo e entre em segundos"
        right={
          <div className="flex items-center gap-2">
            <HeaderIconButton icon={<SlidersHorizontal className="size-4" />} aria-label="Filtros" />
            <HeaderIconButton icon={<HelpCircle className="size-4" />} aria-label="Ajuda" />
          </div>
        }
      />
      <EventViewSwitcher />

      <div className="px-5 space-y-3 pt-3">
        {error && <p className="text-sm text-destructive text-center py-8">{error}</p>}

        {!error && (
          <>
            <div className="grid grid-cols-2 rounded-xl bg-card border border-border p-1 gap-1">
              <button
                onClick={() => setView('discover')}
                className={cn(
                  'rounded-lg font-semibold py-2.5 cursor-pointer',
                  view === 'discover' ? 'bg-accent/40 border border-primary/50 text-primary' : 'text-muted-foreground',
                )}
              >
                Descobrir
              </button>
              <button
                onClick={() => setView('mine')}
                className={cn(
                  'rounded-lg font-semibold py-2.5 cursor-pointer',
                  view === 'mine' ? 'bg-accent/40 border border-primary/50 text-primary' : 'text-muted-foreground',
                )}
              >
                Meus jogos
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-3">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar local..."
                className="bg-transparent outline-none text-sm flex-1 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
              {QUICK_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setQuickFilter(id)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border cursor-pointer',
                    quickFilter === id ? 'bg-accent/40 border-primary/50 text-primary' : 'bg-card border-border text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="text-xs text-muted-foreground">
              {filtered.length} jogo{filtered.length !== 1 ? 's' : ''} {view === 'discover' ? 'disponíveis' : 'seus'}
            </div>

            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum jogo encontrado.</p>
            )}

            {filtered.map((event) => {
              const sport = SPORT_MAP[event.sport as SportId]
              const slots = Math.max(0, event.max_participants - event.participant_count)
              const fill = event.participant_count / event.max_participants
              const durationMin = Math.round(
                (new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000,
              )
              const isToday = isSameDay(new Date(event.starts_at), new Date())

              return (
                <div key={event.id} className="rounded-2xl bg-card border border-border p-4 space-y-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/40 border border-primary/40 px-3 py-1 text-xs text-primary font-medium">
                    <Zap className="size-3" fill="currentColor" />
                    Evento avulso
                  </span>

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xl font-bold text-card-foreground">{sport?.emoji} {event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {event.location_name ?? 'Local a definir'} · {event.max_participants} jogadores
                      </div>
                    </div>
                    <span className={cn(
                      'rounded-full border text-xs font-semibold px-3 py-1 flex-shrink-0',
                      slots > 0 ? 'border-primary/50 text-primary' : 'border-border text-muted-foreground',
                    )}>
                      {slots > 0 ? 'Aberto' : 'Cheio'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-secondary/50 border border-border p-3">
                      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Data</div>
                      <div className="text-sm font-bold mt-1 text-card-foreground">
                        {isToday ? 'Hoje' : formatDate(event.starts_at, { weekday: undefined, day: '2-digit', month: '2-digit' })}
                      </div>
                      <div className="text-sm font-bold text-card-foreground">{formatTime(event.starts_at)}</div>
                    </div>
                    <div className="rounded-xl bg-secondary/50 border border-border p-3">
                      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Duração</div>
                      <div className="text-sm font-bold mt-1 text-card-foreground">{durationMin} min</div>
                    </div>
                    <div className="rounded-xl bg-secondary/50 border border-border p-3">
                      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Vagas</div>
                      <div className="text-sm font-bold mt-1 text-card-foreground">
                        {event.participant_count}/{event.max_participants}
                      </div>
                    </div>
                  </div>

                  {event.creator && (
                    <div className="flex items-center gap-2">
                      <Avatar name={event.creator.name} src={event.creator.avatar_url} size="sm" />
                      <span className="text-xs text-muted-foreground">Criado por {event.creator.nickname}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm mb-1.5 text-foreground">
                        {event.participant_count} de {event.max_participants} vagas preenchidas
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(fill, 1) * 100}%` }} />
                      </div>
                    </div>
                    <Link
                      href={`/e/${event.id}`}
                      className="rounded-full bg-primary text-primary-foreground font-bold px-6 py-2.5 flex-shrink-0"
                    >
                      {event.myStatus ? 'Ver' : 'Entrar'}
                    </Link>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
