'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Bell, Home, Zap, Users, CircleDot, Calendar, ChevronRight, Clock, Check, X, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { Avatar } from '@/components/ui/Avatar'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { HeaderIconButton } from '@/components/layout/HeaderIconButton'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { formatDate, formatTime, cn } from '@/lib/utils'
import { confirmParticipation, declineParticipation } from '@/lib/actions/events'

export interface HomeUser {
  id: string
  name: string
  nickname: string | null
  avatar_url?: string | null
}

export interface HomeGroup {
  id: string
  name: string
  sport: string
  member_count: number
  my_role: string
}

export interface HomeEvent {
  id: string
  group_id: string | null
  sport: string
  starts_at: string
  ends_at: string
  location_name?: string | null
  max_participants: number
  participant_count: number
  my_status: string | null
  group_name: string | null
  visibility?: 'link_only' | 'public' | null
}

export interface HomeNotification {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, string>
  is_read: boolean
  created_at: string
}

interface HomeClientProps {
  user: HomeUser
  groups: HomeGroup[]
  events: HomeEvent[]
  notifications: HomeNotification[]
  unreadCount: number
}

function Chip({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'info' | 'warning' | 'muted' | 'outline'
}) {
  const cls = {
    default: 'bg-secondary text-foreground',
    info:    'bg-info/20 text-info border border-info/40',
    warning: 'bg-warning/20 text-warning border border-warning/40',
    muted:   'bg-secondary text-muted-foreground',
    outline: 'border border-border text-foreground',
  }[variant]
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${cls}`}>
      {children}
    </span>
  )
}

function MatchCard({
  title,
  sportLabel,
  isGroup,
  slots,
  filled,
  total,
  location,
  time,
  visibility,
  status,
  onConfirm,
  onDecline,
}: {
  title: string
  sportLabel?: string
  isGroup: boolean
  slots: number
  filled: number
  total: number
  location: string
  time?: string
  visibility?: 'link_only' | 'public' | null
  status: string | null
  onConfirm: () => void
  onDecline: () => void
}) {
  const canRespond = status === null || status === 'pending'

  return (
    <div className="rounded-2xl bg-card border border-border p-4 space-y-3 mb-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-lg text-card-foreground">{title}</div>
          <div className="text-sm text-muted-foreground">{location}</div>
        </div>
        {status === 'confirmed' ? (
          <span className="rounded-md border border-primary/50 text-primary text-xs font-bold px-2 py-1 flex-shrink-0">
            CONFIRMADO
          </span>
        ) : status === 'declined' ? (
          <span className="rounded-md border border-destructive/50 text-destructive text-xs font-bold px-2 py-1 flex-shrink-0">
            RECUSADO
          </span>
        ) : (
          <span className={cn(
            'rounded-md border text-xs font-bold px-2 py-1 flex-shrink-0',
            slots > 0 ? 'border-primary/50 text-primary' : 'border-border text-muted-foreground',
          )}>
            {slots > 0 ? 'ABERTO' : 'LOTADO'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {sportLabel && <Chip variant="outline">{sportLabel}</Chip>}
        {isGroup ? (
          <Chip variant="info">Grupo</Chip>
        ) : (
          <Chip variant="info">{visibility === 'public' ? 'Público' : 'Só com link'}</Chip>
        )}
        {slots > 0 ? (
          <Chip variant="warning">{slots} vaga{slots === 1 ? '' : 's'}</Chip>
        ) : (
          <Chip variant="muted">Lotado</Chip>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`size-3.5 rounded-full border-2 ${i < filled ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}
          />
        ))}
        <span className="ml-1 text-xs text-muted-foreground">{filled}/{total}</span>
      </div>

      {time && (
        <div className="flex items-center gap-2 pt-2 border-t border-border text-sm text-muted-foreground">
          <Clock className="size-4" />
          <span>{time}</span>
        </div>
      )}

      {canRespond && (
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-primary text-primary-foreground font-semibold py-2 text-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="size-3.5" strokeWidth={3} /> Confirmar
          </button>
          <button
            onClick={onDecline}
            className="rounded-xl border border-border px-3 flex items-center justify-center text-muted-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// Port literal de exact-replication-dev/src/routes/_app.index.tsx (Vite/TanStack → Next),
// com a lista de próximos eventos no estilo MatchCard (de _app.fillups.tsx) no lugar
// do card único "Featured Venue" — mantendo confirmar/recusar de verdade.
export default function HomeClient({ user, events, unreadCount }: HomeClientProps) {
  const [, startTransition] = useTransition()
  const [eventStatuses, setEventStatuses] = useState<Record<string, string | null>>(
    Object.fromEntries(events.map((e) => [e.id, e.my_status])),
  )

  const nickname = user.nickname ?? user.name.split(' ')[0]

  function handleConfirm(eventId: string) {
    setEventStatuses((s) => ({ ...s, [eventId]: 'confirmed' }))
    toast.success('Presença confirmada!')
    startTransition(async () => {
      const result = await confirmParticipation(eventId)
      if (result?.error) {
        setEventStatuses((s) => ({ ...s, [eventId]: null }))
        toast.error(result.error)
      }
    })
  }

  function handleDecline(eventId: string) {
    setEventStatuses((s) => ({ ...s, [eventId]: 'declined' }))
    toast('Presença recusada.', { icon: '👋' })
    startTransition(async () => {
      const result = await declineParticipation(eventId)
      if (result?.error) {
        setEventStatuses((s) => ({ ...s, [eventId]: null }))
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="pb-4">
      <ScreenHeader
        icon={<Home className="size-5" />}
        title={`Olá, ${nickname}`}
        subtitle="Pronto pro próximo jogo?"
        right={
          <div className="flex items-center gap-2">
            <HeaderIconButton href="/descobrir" icon={<Search className="size-4" />} aria-label="Descobrir" />
            <HeaderIconButton
              href="/notifications"
              icon={<Bell className="size-4" />}
              badge={unreadCount}
              aria-label="Notificações"
            />
            <Link href="/profile">
              <Avatar name={user.name} src={user.avatar_url ?? undefined} size="sm" />
            </Link>
          </div>
        }
      />

      <div className="px-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/eventos/fillups" className="rounded-2xl bg-card border border-border p-4 hover:border-primary/40 transition">
            <CircleDot className="size-6 text-primary mb-6" />
            <div className="text-sm font-semibold text-card-foreground">Fill Ups</div>
            <div className="text-xs text-muted-foreground">Encontre companheiros</div>
          </Link>
          <Link href="/eventos/solo-kickoffs" className="rounded-2xl bg-card border border-border p-4 hover:border-primary/40 transition">
            <Zap className="size-6 text-primary mb-6" fill="currentColor" />
            <div className="text-sm font-semibold text-card-foreground">Solo Kickoffs</div>
            <div className="text-xs text-muted-foreground">Entre em segundos</div>
          </Link>
          <Link href="/groups" className="rounded-2xl bg-card border border-border p-4 hover:border-primary/40 transition">
            <Users className="size-6 text-primary mb-6" />
            <div className="text-sm font-semibold text-card-foreground">Meus Grupos</div>
            <div className="text-xs text-muted-foreground">Seus times</div>
          </Link>
          <Link href="/meus-eventos" className="rounded-2xl bg-card border border-border p-4 hover:border-primary/40 transition">
            <Calendar className="size-6 text-primary mb-6" />
            <div className="text-sm font-semibold text-card-foreground">Meus Eventos</div>
            <div className="text-xs text-muted-foreground">Próximos jogos</div>
          </Link>
        </div>

        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Próximos eventos</div>

          {events.length === 0 ? (
            <Link href="/create" className="flex items-center justify-between rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-accent/40 border border-primary/40 flex items-center justify-center text-primary">
                  <Calendar className="size-5" />
                </div>
                <div>
                  <div className="font-semibold text-card-foreground">Nenhum evento próximo</div>
                  <div className="text-xs text-muted-foreground">Criar ou entrar em um jogo</div>
                </div>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
          ) : (
            <div className="space-y-4">
              {events.map((event) => {
                const status = eventStatuses[event.id] ?? null
                const sport = SPORT_MAP[event.sport as SportId]
                const slots = Math.max(0, event.max_participants - event.participant_count)
                const total = Math.min(event.max_participants, 20)
                const time = `${formatDate(event.starts_at, { weekday: 'short', day: '2-digit', month: '2-digit' })} · ${formatTime(event.starts_at)}`
                const href = event.group_id ? `/groups/${event.group_id}/events/${event.id}` : `/e/${event.id}`

                return (
                  <Link key={event.id} href={href} onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) e.preventDefault()
                  }}>
                    <MatchCard
                      title={`${sport?.emoji ?? ''} ${event.group_name ?? 'Evento avulso'}`}
                      sportLabel={sport?.label}
                      isGroup={!!event.group_id}
                      slots={slots}
                      filled={event.participant_count}
                      total={total}
                      location={event.location_name ?? 'Local a definir'}
                      time={time}
                      visibility={event.visibility}
                      status={status}
                      onConfirm={() => handleConfirm(event.id)}
                      onDecline={() => handleDecline(event.id)}
                    />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
