'use client'

import Link from 'next/link'
import { Clock, MapPin, Users } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { SportCover } from '@/components/shared/SportCover'
import { GroupsEventsTabs } from '@/components/shared/GroupsEventsTabs'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { formatDate, formatTime } from '@/lib/utils'
import type { PublicEventCard } from '@/lib/actions/events'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmado',
  pending: 'Pendente',
  declined: 'Recusado',
}

export function DiscoverEventsClient({ events, error }: { events: PublicEventCard[]; error?: string }) {
  return (
    <div>
      <ScreenHeader
        icon={<Users className="size-5" />}
        title="Eventos avulsos"
        subtitle="Encontre jogos públicos perto de você"
      />
      <GroupsEventsTabs active="discover" />

      <div className="px-5 py-4 space-y-3">
        <p className="text-xs text-slate-500">
          Eventos avulsos públicos criados por outros usuários do app. Pedir pra participar exige aprovação do organizador.
        </p>

        {error && (
          <p className="text-sm text-red-400 text-center py-8">{error}</p>
        )}

        {!error && events.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">
            Nenhum evento público no momento.
          </p>
        )}

        {events.map((event) => {
          const sport = SPORT_MAP[event.sport as SportId]
          const slotsLeft = Math.max(0, event.max_participants - event.participant_count)

          return (
            <Link key={event.id} href={`/e/${event.id}`}>
              <Card interactive>
                <div className="flex items-start gap-3 mb-3">
                  <SportCover sport={event.sport as SportId} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{event.title}</p>
                    <p className="text-xs text-slate-400 capitalize mt-0.5 flex items-center gap-1.5">
                      <Clock className="size-3" />
                      {formatDate(event.starts_at, { weekday: 'short', day: '2-digit', month: '2-digit' })}
                      {' · '}{formatTime(event.starts_at)}
                    </p>
                  </div>
                  {event.myStatus && (
                    <Badge variant={event.myStatus === 'confirmed' ? 'success' : 'warning'} size="sm">
                      {STATUS_LABEL[event.myStatus]}
                    </Badge>
                  )}
                </div>

                {event.location_name && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                    <MapPin className="size-3 flex-shrink-0" />
                    <span className="truncate">{event.location_name}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Users className="size-3" />
                    {event.participant_count}/{event.max_participants} confirmados
                    <span className={slotsLeft > 0 ? 'text-primary-400' : 'text-amber-400'}>
                      {' · '}{slotsLeft > 0 ? `${slotsLeft} vagas` : 'Lotado'}
                    </span>
                  </div>
                  {event.creator && (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={event.creator.name} src={event.creator.avatar_url} size="xs" />
                      <span className="text-[11px] text-slate-500">{event.creator.nickname}</span>
                    </div>
                  )}
                </div>

                <Badge variant="primary" size="sm" className="mt-2">{sport?.emoji} {sport?.label}</Badge>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
