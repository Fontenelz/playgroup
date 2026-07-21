'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { formatDate, formatTime, formatCurrency, cn, copyToClipboard } from '@/lib/utils'
import { declineParticipation } from '@/lib/actions/events'
import type { MyEventCard } from '@/lib/actions/events'

type TabId = 'upcoming' | 'past' | 'cancelled'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'CONFIRMADO',
  pending:   'PENDENTE',
  declined:  'CANCELADO',
  waitlist:  'NA FILA',
  absent:    'AUSENTE',
  present:   'PRESENTE',
}

// Port literal de exact-replication-dev/src/routes/bookings.tsx (Vite/TanStack → Next).
export function MeusEventosClient({ events, error }: { events: MyEventCard[]; error?: string }) {
  const [tab, setTab] = useState<TabId>('upcoming')
  const [isPending, startTransition] = useTransition()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [localEvents, setLocalEvents] = useState(events)

  const upcoming = localEvents.filter((e) => new Date(e.starts_at) > new Date() && e.my_status !== 'declined')
  const past = localEvents.filter((e) => new Date(e.starts_at) <= new Date() && e.my_status !== 'declined')
  const cancelled = localEvents.filter((e) => e.my_status === 'declined')

  const list = tab === 'upcoming' ? upcoming : tab === 'past' ? past : cancelled

  function handleCancel(eventId: string) {
    setCancellingId(eventId)
    startTransition(async () => {
      const result = await declineParticipation(eventId)
      setCancellingId(null)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setLocalEvents((evts) => evts.map((e) => (e.id === eventId ? { ...e, my_status: 'declined' } : e)))
        toast('Participação cancelada.')
      }
    })
  }

  async function handleShare(event: MyEventCard) {
    const url = `${window.location.origin}${event.group_id ? `/groups/${event.group_id}/events/${event.id}` : `/e/${event.id}`}`
    const ok = await copyToClipboard(url)
    if (ok) toast.success('Link copiado!')
    else toast.error('Não foi possível copiar o link.')
  }

  return (
    <div>
      <Header title="Meus Eventos" showBack backHref="/profile" />

      <div className="px-5 pt-2">
        <p className="text-sm text-muted-foreground">
          {upcoming.length} próximo{upcoming.length !== 1 ? 's' : ''} · {past.length} passado{past.length !== 1 ? 's' : ''} · {cancelled.length} cancelado{cancelled.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="px-5 mt-4 grid grid-cols-3 gap-2">
        {([
          ['upcoming', 'Próximos'],
          ['past', 'Passados'],
          ['cancelled', 'Cancelados'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'rounded-xl py-2.5 text-sm font-semibold cursor-pointer transition-colors',
              tab === id ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-5 mt-4 space-y-3 pb-8">
        {error && <p className="text-sm text-destructive text-center py-8">{error}</p>}

        {!error && list.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhum evento aqui.</p>
        )}

        {!error && list.map((event) => {
          const sport = SPORT_MAP[event.sport as SportId]
          const durationMin = Math.round(
            (new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000,
          )
          const canCancel = tab === 'upcoming' && (event.my_status === 'confirmed' || event.my_status === 'pending')

          return (
            <div key={event.id} className="rounded-2xl bg-card border border-border p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-lg text-card-foreground">
                    {sport?.emoji} {event.group_name ?? event.title}
                  </div>
                  <div className="text-sm text-muted-foreground">{event.location_name ?? 'Local a definir'}</div>
                </div>
                {event.my_status && (
                  <span className={cn(
                    'rounded-full border text-xs font-bold px-3 py-1 flex-shrink-0',
                    event.my_status === 'confirmed' && 'border-primary/60 text-primary',
                    event.my_status === 'pending' && 'border-warning/60 text-warning',
                    (event.my_status === 'declined' || event.my_status === 'absent') && 'border-destructive/60 text-destructive',
                    (event.my_status === 'waitlist' || event.my_status === 'present') && 'border-info/60 text-info',
                  )}>
                    {STATUS_LABEL[event.my_status]}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Data</div>
                  <div className="font-bold text-sm mt-1 text-card-foreground">
                    {formatDate(event.starts_at, { weekday: undefined, day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Hora</div>
                  <div className="font-bold text-sm mt-1 text-card-foreground">{formatTime(event.starts_at)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Duração</div>
                  <div className="font-bold text-sm mt-1 text-card-foreground">{durationMin} min</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                    {event.event_fee ? 'Valor' : 'Vagas'}
                  </div>
                  <div className="font-bold text-sm mt-1 text-card-foreground">
                    {event.event_fee
                      ? formatCurrency(event.event_fee)
                      : `${event.participant_count}/${event.max_participants}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border text-sm font-semibold">
                <button onClick={() => handleShare(event)} className="text-primary cursor-pointer">
                  Compartilhar
                </button>
                <Link
                  href={event.group_id ? `/groups/${event.group_id}/events/${event.id}` : `/e/${event.id}`}
                  className="text-muted-foreground"
                >
                  Detalhes
                </Link>
                {canCancel && (
                  <button
                    onClick={() => handleCancel(event.id)}
                    disabled={isPending && cancellingId === event.id}
                    className="text-destructive cursor-pointer disabled:opacity-50"
                  >
                    {isPending && cancellingId === event.id ? 'Cancelando...' : 'Cancelar'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
