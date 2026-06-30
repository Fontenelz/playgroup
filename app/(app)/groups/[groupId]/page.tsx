'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Settings, Share2, Star, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { SportIcon } from '@/components/shared/SportIcon'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  MOCK_GROUPS, MOCK_EVENTS, MOCK_MEMBERS, MOCK_RANKING,
} from '@/data/mock'
import { SPORT_MAP } from '@/lib/constants'
import { formatDate, formatTime, formatCurrency, cn } from '@/lib/utils'

type Tab = 'events' | 'members' | 'ranking'

export default function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params)
  const group = MOCK_GROUPS.find((g) => g.id === groupId) ?? MOCK_GROUPS[0]
  const [tab, setTab] = useState<Tab>('events')

  const sport = SPORT_MAP[group.sport]
  const isAdmin = group.my_role === 'admin'
  const isOrganizer = group.my_role === 'admin' || group.my_role === 'organizer'

  const groupEvents = MOCK_EVENTS.filter((e) => e.group_id === group.id)
  const upcoming = groupEvents.filter((e) => new Date(e.starts_at) >= new Date())
  const past = groupEvents.filter((e) => new Date(e.starts_at) < new Date())

  const tabs: { id: Tab; label: string }[] = [
    { id: 'events',  label: 'Eventos'  },
    { id: 'members', label: 'Membros'  },
    { id: 'ranking', label: 'Ranking'  },
  ]

  return (
    <div className="min-h-screen">
      <Header
        showBack
        rightAction={
          <div className="flex gap-1">
            <button className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 cursor-pointer">
              <Share2 className="size-4" />
            </button>
            {isAdmin && (
              <Link href={`/groups/${groupId}/settings`} className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400">
                <Settings className="size-4" />
              </Link>
            )}
          </div>
        }
      />

      {/* Group hero */}
      <div className="px-4 pb-4 pt-1">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-5">
          <div className="absolute inset-0 opacity-5 text-[120px] flex items-center justify-end pr-4 select-none pointer-events-none">
            {sport?.emoji}
          </div>
          <div className="relative">
            <SportIcon sport={group.sport} size="lg" className="mb-3" />
            <h1 className="text-xl font-bold text-slate-100 leading-tight">{group.name}</h1>
            {group.description && (
              <p className="text-sm text-slate-400 mt-1">{group.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-xs text-slate-400">{group.member_count} membros</span>
              {group.my_role && (
                <Badge
                  variant={group.my_role === 'admin' ? 'primary' : group.my_role === 'organizer' ? 'warning' : 'neutral'}
                  size="sm"
                >
                  {group.my_role === 'admin' ? '⭐ Admin' : group.my_role === 'organizer' ? 'Organizador' : 'Membro'}
                </Badge>
              )}
              <Badge variant="neutral" size="sm">{group.plan}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-2xl p-1">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer',
                tab === id
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                  : 'text-slate-400 hover:text-slate-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="px-4 pb-4"
        >
          {tab === 'events' && (
            <EventsTab
              upcoming={upcoming}
              past={past}
              groupId={group.id}
              isOrganizer={isOrganizer}
            />
          )}
          {tab === 'members' && (
            <MembersTab members={MOCK_MEMBERS} isOrganizer={isOrganizer} group={group} />
          )}
          {tab === 'ranking' && (
            <RankingTab />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Events Tab ────────────────────────────────────────────────────────────────

function EventsTab({
  upcoming, past, groupId, isOrganizer,
}: {
  upcoming: typeof MOCK_EVENTS
  past: typeof MOCK_EVENTS
  groupId: string
  isOrganizer: boolean
}) {
  return (
    <div className="space-y-5">
      {isOrganizer && (
        <Link href={`/groups/${groupId}/events/create`}>
          <div className="flex items-center gap-3 p-4 border border-dashed border-primary-500/40 bg-primary-500/5 rounded-2xl hover:bg-primary-500/10 transition-all">
            <div className="size-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Plus className="size-5 text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-300">Criar novo evento</p>
              <p className="text-xs text-slate-500">Único ou recorrente</p>
            </div>
          </div>
        </Link>
      )}

      {upcoming.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Próximos</p>
          <div className="space-y-3">
            {upcoming.map((event, i) => (
              <EventCard key={event.id} event={event} groupId={groupId} index={i} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Anteriores</p>
          <div className="space-y-2">
            {past.map((event) => (
              <Link key={event.id} href={`/groups/${groupId}/events/${event.id}`}>
                <div className="flex items-center gap-3 py-3 px-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all">
                  <div className="size-2 rounded-full bg-slate-600 flex-shrink-0" />
                  <span className="text-sm text-slate-400 flex-1">
                    {formatDate(event.starts_at, { weekday: undefined, day: '2-digit', month: '2-digit' })}
                  </span>
                  <span className="text-xs text-slate-500">
                    {event.participant_count}/{event.max_participants}
                  </span>
                  <ChevronRight className="size-4 text-slate-600" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-sm text-slate-400">Nenhum evento ainda.</p>
          {isOrganizer && <p className="text-xs text-slate-500 mt-1">Crie o primeiro evento acima.</p>}
        </div>
      )}
    </div>
  )
}

function EventCard({ event, groupId, index }: { event: typeof MOCK_EVENTS[0]; groupId: string; index: number }) {
  const slots = event.max_participants - event.participant_count
  const fill = event.participant_count / event.max_participants

  const statusMap = {
    confirmed: { label: 'Confirmado', badge: 'success' as const },
    pending:   { label: 'Pendente',   badge: 'warning' as const },
    declined:  { label: 'Recusou',    badge: 'error'   as const },
    waitlist:  { label: 'Na fila',    badge: 'info'    as const },
    absent:    { label: 'Ausente',    badge: 'error'   as const },
    present:   { label: 'Presente',   badge: 'success' as const },
  }
  const myStatusCfg = event.my_status ? statusMap[event.my_status] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link href={`/groups/${groupId}/events/${event.id}`}>
        <div className={cn(
          'bg-slate-900 border rounded-2xl p-4 transition-all active:scale-[0.99] hover:border-slate-700 space-y-3',
          event.my_status === 'confirmed' ? 'border-primary-500/30' : 'border-slate-800',
        )}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold text-slate-100">
                {formatDate(event.starts_at, { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </p>
              <p className="text-sm text-slate-400 mt-0.5">
                {formatTime(event.starts_at)} – {formatTime(event.ends_at)}
              </p>
              {event.location_name && (
                <p className="text-xs text-slate-500 mt-1">📍 {event.location_name}</p>
              )}
            </div>
            {myStatusCfg && (
              <Badge variant={myStatusCfg.badge} size="sm">{myStatusCfg.label}</Badge>
            )}
          </div>

          {/* Slots progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{event.participant_count}/{event.max_participants} confirmados</span>
              <span className={cn('font-medium', slots > 0 ? 'text-primary-400' : 'text-amber-400')}>
                {slots > 0 ? `${slots} vagas livres` : 'Lotado'}
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${fill * 100}%` }}
                transition={{ duration: 0.5, delay: index * 0.06 + 0.15 }}
                className={cn('h-full rounded-full', fill >= 1 ? 'bg-amber-500' : 'bg-primary-500')}
              />
            </div>
          </div>

          {event.notes && (
            <p className="text-xs text-slate-500 bg-slate-800 rounded-lg px-3 py-2 leading-relaxed">
              📝 {event.notes}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

// ─── Members Tab ───────────────────────────────────────────────────────────────

function MembersTab({
  members, isOrganizer, group,
}: {
  members: typeof MOCK_MEMBERS
  isOrganizer: boolean
  group: typeof MOCK_GROUPS[0]
}) {
  const monthly = members.filter((m) => m.member_type === 'monthly')
  const regular = members.filter((m) => m.member_type === 'regular')

  return (
    <div className="space-y-5">
      {group.monthly_fee && (
        <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div>
            <p className="text-xs text-slate-500">Mensalidade</p>
            <p className="text-lg font-bold text-slate-100">{formatCurrency(group.monthly_fee)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Vence todo dia</p>
            <p className="text-lg font-bold text-slate-100">{group.payment_day}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Avulso</p>
            <p className="text-lg font-bold text-slate-100">
              {group.per_event_fee ? formatCurrency(group.per_event_fee) : '—'}
            </p>
          </div>
        </div>
      )}

      {monthly.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Star className="size-3 text-amber-400 fill-amber-400" /> Mensalistas ({monthly.length})
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {monthly.map((m, i) => (
              <MemberRow key={m.id} member={m} index={i} showBorder={i > 0} isOrganizer={isOrganizer} />
            ))}
          </div>
        </section>
      )}

      {regular.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Avulsos ({regular.length})</p>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {regular.map((m, i) => (
              <MemberRow key={m.id} member={m} index={i} showBorder={i > 0} isOrganizer={isOrganizer} />
            ))}
          </div>
        </section>
      )}

      {isOrganizer && (
        <Button variant="outline" fullWidth leftIcon={<Plus className="size-4" />}>
          Convidar membro
        </Button>
      )}
    </div>
  )
}

function MemberRow({
  member, index, showBorder, isOrganizer,
}: {
  member: typeof MOCK_MEMBERS[0]
  index: number
  showBorder: boolean
  isOrganizer: boolean
}) {
  const isMe = member.user_id === 'user-matheus'
  const payConfig = {
    paid:    { label: 'Pago',     variant: 'success' as const },
    pending: { label: 'Pendente', variant: 'warning' as const },
    overdue: { label: 'Atrasado', variant: 'error'   as const },
    cancelled: { label: '—',      variant: 'neutral' as const },
    refunded:  { label: 'Dev.',   variant: 'neutral' as const },
  }
  const pay = payConfig[member.payment_status]

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        showBorder && 'border-t border-slate-800',
        isMe && 'bg-primary-500/5',
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar name={member.user.name} src={member.user.avatar_url} size="sm" />
        {member.member_type === 'monthly' && (
          <div className="absolute -top-1 -right-1 size-4 rounded-full bg-amber-500 flex items-center justify-center">
            <Star className="size-2.5 text-white fill-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={cn('text-sm font-medium truncate', isMe ? 'text-primary-300' : 'text-slate-200')}>
            {member.user.nickname}
          </p>
          {member.role === 'admin' && <span className="text-[10px] text-amber-400">👑</span>}
          {member.role === 'organizer' && <span className="text-[10px] text-blue-400">🎯</span>}
        </div>
        {'⭐'.repeat(member.skill_rating) && (
          <p className="text-[10px] text-amber-500/70">{'★'.repeat(member.skill_rating)}{'☆'.repeat(5 - member.skill_rating)}</p>
        )}
      </div>

      {(isOrganizer || isMe) && (
        <Badge variant={pay.variant} size="sm">{pay.label}</Badge>
      )}
    </motion.div>
  )
}

// ─── Ranking Tab ───────────────────────────────────────────────────────────────

function RankingTab() {
  const [tab, setTab] = useState<'presences' | 'goals' | 'assists'>('presences')

  const sorted = [...MOCK_RANKING].sort((a, b) => {
    if (tab === 'presences') return b.presences - a.presences
    if (tab === 'goals') return b.goals - a.goals
    return b.assists - a.assists
  })

  const subtabs = [
    { id: 'presences' as const, label: 'Presenças' },
    { id: 'goals'     as const, label: 'Gols'      },
    { id: 'assists'   as const, label: 'Assists'   },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {subtabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer',
              tab === id ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-400',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {sorted.map((entry, i) => {
          const value = tab === 'presences' ? entry.presences : tab === 'goals' ? entry.goals : entry.assists
          const isMe = entry.user.id === 'user-matheus'

          return (
            <motion.div
              key={entry.user.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                'flex items-center gap-3 px-4 py-3',
                i > 0 && 'border-t border-slate-800',
                isMe && 'bg-primary-500/5',
              )}
            >
              <span className={cn('w-6 text-sm font-bold text-center flex-shrink-0', i < 3 ? 'text-amber-400' : 'text-slate-600')}>
                {['🥇', '🥈', '🥉'][i] ?? i + 1}
              </span>
              <Avatar name={entry.user.name} src={entry.user.avatar_url} size="sm" />
              <p className={cn('flex-1 text-sm font-medium truncate', isMe ? 'text-primary-300' : 'text-slate-200')}>
                {entry.user.nickname}
                {isMe && <span className="text-xs text-slate-500 ml-1">(você)</span>}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-100">{value}</span>
                {entry.trend === 'up'   && <TrendingUp   className="size-3.5 text-emerald-400" />}
                {entry.trend === 'down' && <TrendingDown  className="size-3.5 text-red-400" />}
                {entry.trend === 'same' && <Minus         className="size-3.5 text-slate-600" />}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
