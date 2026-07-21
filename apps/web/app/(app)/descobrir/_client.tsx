'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Clock, MapPin, Search, Users, UserCheck, Clock3 } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { SportCover } from '@/components/shared/SportCover'
import { EventViewSwitcher } from '@/components/shared/EventViewSwitcher'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { formatDate, formatTime, cn } from '@/lib/utils'
import type { PublicEventCard } from '@/lib/actions/events'
import type { PublicGroupCard } from '@/lib/actions/groups'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmado',
  pending: 'Pendente',
  declined: 'Recusado',
}

interface DiscoverClientProps {
  events: PublicEventCard[]
  eventsError?: string
  groups: PublicGroupCard[]
  groupsError?: string
}

export function DiscoverClient({ events, eventsError, groups, groupsError }: DiscoverClientProps) {
  const [tab, setTab] = useState<'groups' | 'events'>('groups')

  return (
    <div>
      <ScreenHeader
        icon={<Users className="size-5" />}
        title="Descobrir"
        subtitle="Grupos e eventos públicos perto de você"
      />

      <Card className="flex gap-1 p-1 mx-4 mt-3 rounded-xl">
        <button
          onClick={() => setTab('groups')}
          className={cn(
            'flex-1 text-center text-sm font-medium py-2 rounded-lg transition-colors cursor-pointer',
            tab === 'groups'
              ? 'bg-primary-500/15 border border-primary-500/50 text-primary-400'
              : 'text-slate-500 hover:text-slate-300',
          )}
        >
          Grupos
        </button>
        <button
          onClick={() => setTab('events')}
          className={cn(
            'flex-1 text-center text-sm font-medium py-2 rounded-lg transition-colors cursor-pointer',
            tab === 'events'
              ? 'bg-primary-500/15 border border-primary-500/50 text-primary-400'
              : 'text-slate-500 hover:text-slate-300',
          )}
        >
          Eventos avulsos
        </button>
      </Card>

      {tab === 'events' && <EventViewSwitcher />}

      {tab === 'groups' ? (
        <GroupsList groups={groups} error={groupsError} />
      ) : (
        <EventsList events={events} error={eventsError} />
      )}
    </div>
  )
}

function GroupsList({ groups, error }: { groups: PublicGroupCard[]; error?: string }) {
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState<string>('all')

  const availableSports = useMemo(() => Array.from(new Set(groups.map((g) => g.sport))), [groups])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups.filter((group) => {
      const matchesSport = sportFilter === 'all' || group.sport === sportFilter
      const matchesSearch = !q || group.name.toLowerCase().includes(q)
      return matchesSport && matchesSearch
    })
  }, [groups, search, sportFilter])

  return (
    <div className="px-5 py-4 space-y-3">
      <p className="text-xs text-slate-500">
        Grupos públicos criados por outros usuários do app. Solicitar entrada exige aprovação do organizador.
      </p>

      {error && <p className="text-sm text-red-400 text-center py-8">{error}</p>}

      {!error && groups.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">Nenhum grupo público no momento.</p>
      )}

      {!error && groups.length > 0 && (
        <>
          <Card className="flex items-center gap-2 px-4 py-3">
            <Search className="size-4 text-slate-500 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome do grupo..."
              className="bg-transparent outline-none text-sm flex-1 text-slate-100 placeholder:text-slate-500"
            />
          </Card>

          {availableSports.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
              <button
                onClick={() => setSportFilter('all')}
                className={cn(
                  'flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors cursor-pointer',
                  sportFilter === 'all'
                    ? 'bg-primary-500/15 border-primary-500/50 text-primary-400'
                    : 'bg-slate-900 border-slate-700 text-slate-300',
                )}
              >
                Todos
              </button>
              {availableSports.map((s) => {
                const sport = SPORT_MAP[s as SportId]
                return (
                  <button
                    key={s}
                    onClick={() => setSportFilter(s)}
                    className={cn(
                      'flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors cursor-pointer',
                      sportFilter === s
                        ? 'bg-primary-500/15 border-primary-500/50 text-primary-400'
                        : 'bg-slate-900 border-slate-700 text-slate-300',
                    )}
                  >
                    {sport?.emoji} {sport?.label}
                  </button>
                )
              })}
            </div>
          )}

          {filtered.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">Nenhum grupo encontrado com esse filtro.</p>
          )}
        </>
      )}

      <div className='space-y-3'>
        {filtered.map((group) => {
          const sport = SPORT_MAP[group.sport as SportId]
          const card = (
            <Card interactive className='mb-2'>
              <div className="flex items-start gap-3 mb-3">
                <SportCover sport={group.sport as SportId} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{group.name}</p>
                  {group.description && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{group.description}</p>
                  )}
                </div>
                {group.my_status === 'active' && (
                  <Badge variant="success" size="sm" className="gap-1">
                    <UserCheck className="size-3" />
                    Membro
                  </Badge>
                )}
                {group.my_status === 'pending' && (
                  <Badge variant="warning" size="sm" className="gap-1">
                    <Clock3 className="size-3" />
                    Pendente
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Users className="size-3" />
                  {group.member_count}/{group.max_members} membros
                </div>
                <Badge variant="primary" size="sm">{sport?.emoji} {sport?.label}</Badge>
              </div>
            </Card>
          )

          const href = group.my_status === 'active' ? `/groups/${group.id}` : `/groups/${group.id}/preview`

          return (
            <Link key={group.id} href={href}>
              {card}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function EventsList({ events, error }: { events: PublicEventCard[]; error?: string }) {
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState<string>('all')

  const availableSports = useMemo(
    () => Array.from(new Set(events.map((e) => e.sport))),
    [events],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events.filter((event) => {
      const matchesSport = sportFilter === 'all' || event.sport === sportFilter
      const matchesSearch =
        !q ||
        event.title.toLowerCase().includes(q) ||
        (event.location_name?.toLowerCase().includes(q) ?? false)
      return matchesSport && matchesSearch
    })
  }, [events, search, sportFilter])

  return (
    <div className="px-5 py-4 space-y-3">
      <p className="text-xs text-slate-500">
        Eventos avulsos públicos criados por outros usuários do app. Pedir pra participar exige aprovação do organizador.
      </p>

      {error && <p className="text-sm text-red-400 text-center py-8">{error}</p>}

      {!error && events.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">Nenhum evento público no momento.</p>
      )}

      {!error && events.length > 0 && (
        <>
          <Card className="flex items-center gap-2 px-4 py-3">
            <Search className="size-4 text-slate-500 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou local..."
              className="bg-transparent outline-none text-sm flex-1 text-slate-100 placeholder:text-slate-500"
            />
          </Card>

          {availableSports.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
              <button
                onClick={() => setSportFilter('all')}
                className={cn(
                  'flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors cursor-pointer',
                  sportFilter === 'all'
                    ? 'bg-primary-500/15 border-primary-500/50 text-primary-400'
                    : 'bg-slate-900 border-slate-700 text-slate-300',
                )}
              >
                Todos
              </button>
              {availableSports.map((s) => {
                const sport = SPORT_MAP[s as SportId]
                return (
                  <button
                    key={s}
                    onClick={() => setSportFilter(s)}
                    className={cn(
                      'flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors cursor-pointer',
                      sportFilter === s
                        ? 'bg-primary-500/15 border-primary-500/50 text-primary-400'
                        : 'bg-slate-900 border-slate-700 text-slate-300',
                    )}
                  >
                    {sport?.emoji} {sport?.label}
                  </button>
                )
              })}
            </div>
          )}

          {filtered.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">Nenhum evento encontrado com esse filtro.</p>
          )}
        </>
      )}

      {filtered.map((event) => {
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
  )
}
