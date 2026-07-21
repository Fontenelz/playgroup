'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Users, HelpCircle, Plus, ChevronDown, SlidersHorizontal, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { EventViewSwitcher } from '@/components/shared/EventViewSwitcher'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { formatDate, formatTime } from '@/lib/utils'
import type { PublicEventCard } from '@/lib/actions/events'

function Chip({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'info' | 'warning'
}) {
  const cls = {
    default: 'bg-secondary text-foreground',
    info:    'bg-info/20 text-info border border-info/40',
    warning: 'bg-warning/20 text-warning border border-warning/40',
  }[variant]
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${cls}`}>
      {children}
    </span>
  )
}

function MatchCard({ event }: { event: PublicEventCard }) {
  const sport = SPORT_MAP[event.sport as SportId]
  const slots = Math.max(0, event.max_participants - event.participant_count)
  const total = Math.min(event.max_participants, 20)

  return (
    <Link href={`/e/${event.id}`}>
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-bold text-lg text-card-foreground">{sport?.emoji} {sport?.label}</div>
            <div className="text-sm text-muted-foreground">{event.location_name ?? event.title}</div>
          </div>
          <span className={`rounded-md border text-xs font-bold px-2 py-1 flex-shrink-0 ${slots > 0 ? 'border-primary/50 text-primary' : 'border-border text-muted-foreground'}`}>
            {slots > 0 ? 'OPEN' : 'CHEIO'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip variant="info">Evento público</Chip>
          {slots > 0 && <Chip variant="warning">{slots} vaga{slots === 1 ? '' : 's'} aberta{slots === 1 ? '' : 's'}</Chip>}
          <Chip>{sport?.label}</Chip>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`size-3.5 rounded-full border-2 ${i < event.participant_count ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}
            />
          ))}
          <span className="ml-1 text-xs text-muted-foreground">
            {slots > 0 ? `${slots} vaga${slots === 1 ? '' : 's'} aberta${slots === 1 ? '' : 's'}` : 'Lotado'}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            <span>
              {formatDate(event.starts_at, { weekday: 'short', day: '2-digit', month: '2-digit' })}
              {' · '}{formatTime(event.starts_at)}
            </span>
          </div>
          {slots > 0 && <span className="text-primary text-sm font-semibold">Precisa de gente</span>}
        </div>
      </div>
    </Link>
  )
}

export function FillUpsClient({ events, error }: { events: PublicEventCard[]; error?: string }) {
  const [showFilters, setShowFilters] = useState(false)
  const [sportFilter, setSportFilter] = useState<string>('all')

  const availableSports = useMemo(() => Array.from(new Set(events.map((e) => e.sport))), [events])
  const filtered = sportFilter === 'all' ? events : events.filter((e) => e.sport === sportFilter)
  const dateLabel = filtered.length > 0
    ? formatDate(filtered[0].starts_at, { weekday: 'short', day: '2-digit', month: 'long' })
    : null

  return (
    <div className="pb-4">
      <ScreenHeader
        icon={<Users className="size-5" />}
        title="Team Fill Ups"
        subtitle="Reservou quadra mas faltam jogadores?"
        right={
          <div className="flex items-center gap-2">
            <button className="size-10 rounded-full bg-secondary border border-primary/40 text-primary flex items-center justify-center">
              <HelpCircle className="size-5" />
            </button>
            <Link
              href="/create/evento"
              className="h-10 px-4 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-1.5"
            >
              <Plus className="size-4" strokeWidth={3} />
              Criar
            </Link>
          </div>
        }
      />
      <EventViewSwitcher />

      <div className="px-5 space-y-3 pt-3">
        {error && <p className="text-sm text-destructive text-center py-8">{error}</p>}

        {!error && (
          <>
            <button
              onClick={() => setShowFilters(true)}
              className="w-full flex items-center justify-between rounded-2xl bg-card border border-border px-4 py-3.5 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="size-8 rounded-lg bg-secondary flex items-center justify-center">
                  <SlidersHorizontal className="size-4" />
                </span>
                <span className="font-semibold text-card-foreground">
                  {sportFilter === 'all' ? 'Filtros' : SPORT_MAP[sportFilter as SportId]?.label}
                </span>
              </div>
              <ChevronDown className="size-5 text-muted-foreground" />
            </button>

            {dateLabel && (
              <div className="flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3">
                <span className="size-9 rounded-lg bg-secondary flex items-center justify-center text-primary">
                  <CalendarIcon className="size-4" />
                </span>
                <div>
                  <p className="font-semibold text-sm text-card-foreground capitalize">{dateLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {filtered.length} evento{filtered.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum evento público no momento.</p>
            )}

            {filtered.map((event) => (
              <MatchCard key={event.id} event={event} />
            ))}
          </>
        )}
      </div>

      <BottomSheet isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filtrar por esporte">
        <div className="space-y-2">
          <button
            onClick={() => { setSportFilter('all'); setShowFilters(false) }}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium cursor-pointer ${sportFilter === 'all' ? 'bg-accent/40 text-primary' : 'text-foreground hover:bg-secondary'}`}
          >
            Todos os esportes
          </button>
          {availableSports.map((s) => {
            const sport = SPORT_MAP[s as SportId]
            return (
              <button
                key={s}
                onClick={() => { setSportFilter(s); setShowFilters(false) }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium cursor-pointer ${sportFilter === s ? 'bg-accent/40 text-primary' : 'text-foreground hover:bg-secondary'}`}
              >
                {sport?.emoji} {sport?.label}
              </button>
            )
          })}
        </div>
      </BottomSheet>
    </div>
  )
}
