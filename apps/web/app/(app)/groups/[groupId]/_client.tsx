'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Settings, Share2, Star, ChevronRight, Copy, Check, X, Link2, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { HeaderIconButton } from '@/components/layout/HeaderIconButton'
import { SportCover } from '@/components/shared/SportCover'
import { SportIcon } from '@/components/shared/SportIcon'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Card } from '@/components/ui/Card'
import { createInviteCode, removeMember, approveJoinRequest, rejectJoinRequest } from '@/lib/actions/groups'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { formatDate, formatTime, formatCurrency, cn, copyToClipboard } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GroupDetail {
  id: string
  name: string
  description?: string | null
  sport: string
  monthly_fee?: number | null
  per_event_fee?: number | null
  payment_day?: number | null
  payment_deadline_hours?: number | null
  plan: string
  admin_id: string
  access_type: string
  max_members: number
}

export interface EventItem {
  id: string
  title: string
  starts_at: string
  ends_at: string
  location_name?: string | null
  max_participants: number
  participant_count: number
  notes?: string | null
  my_status: string | null
  confirmed_avatars?: { name: string; avatar_url?: string }[]
}

export interface MemberItem {
  id: string
  role: string
  member_type: string
  skill_rating: number
  user_id: string
  user: { id: string; name: string; nickname: string | null; avatar_url?: string | null }
  last_presence_at?: string | null
  invited_by?: { id: string; name: string; nickname: string | null } | null
}

export interface RankingEntry {
  user_id: string
  user: { id: string; name: string; nickname: string | null; avatar_url?: string | null }
  presences: number
  last_presence_at: string
}

interface GroupPageClientProps {
  groupId: string
  currentUserId: string
  group: GroupDetail
  myRole: string
  memberCount: number
  events: EventItem[]
  members: MemberItem[]
  pendingRequests: MemberItem[]
  ranking: RankingEntry[]
}

// ─── Main client component ──────────────────────────────────────────────────

type Tab = 'events' | 'members' | 'ranking'

export default function GroupPageClient({
  groupId,
  currentUserId,
  group,
  myRole,
  memberCount,
  events,
  members,
  pendingRequests,
  ranking,
}: GroupPageClientProps) {
  const [tab, setTab] = useState<Tab>('events')
  const [shareOpen, setShareOpen] = useState(false)

  const isAdmin = myRole === 'admin'
  const isOrganizer = myRole === 'admin' || myRole === 'organizer'

  const upcoming = events.filter((e) => new Date(e.starts_at) >= new Date())
  const past = events.filter((e) => new Date(e.starts_at) < new Date())

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
          <div className="flex gap-2">
            <HeaderIconButton onClick={() => setShareOpen(true)} icon={<Share2 className="size-4" />} aria-label="Compartilhar" />
            {isAdmin && (
              <HeaderIconButton href={`/groups/${groupId}/settings`} icon={<Settings className="size-4" />} aria-label="Configurações" />
            )}
          </div>
        }
      />

      {/* Group hero */}
      <div className="px-4 pb-4 pt-1">
        <Card className="relative p-0 overflow-hidden">
          <div className="relative h-28">
            <SportCover sport={group.sport as SportId} size="banner" className="absolute inset-0" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
            <SportIcon sport={group.sport as SportId} size="sm" className="absolute bottom-2 left-4 ring-2 ring-slate-900" />
          </div>
          <div className="p-5 pt-3">
            <h1 className="text-xl font-bold text-slate-100 leading-tight">{group.name}</h1>
            {group.description && (
              <p className="text-sm text-slate-400 mt-1">{group.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-xs text-slate-400">{memberCount} membros</span>
              {myRole && (
                <Badge
                  variant={myRole === 'admin' ? 'primary' : myRole === 'organizer' ? 'warning' : 'neutral'}
                  size="sm"
                >
                  {myRole === 'admin' ? '⭐ Admin' : myRole === 'organizer' ? 'Organizador' : 'Membro'}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <Card className="flex gap-1 p-1 rounded-xl">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer relative',
                tab === id
                  ? 'bg-primary-500/15 border border-primary-500/50 text-primary-400'
                  : 'text-slate-400 hover:text-slate-300',
              )}
            >
              {label}
              {id === 'members' && isOrganizer && pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 size-4 rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          ))}
        </Card>
      </div>

      <InviteSheet groupId={groupId} isOpen={shareOpen} onClose={() => setShareOpen(false)} />

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
              sport={group.sport}
              isOrganizer={isOrganizer}
              perEventFee={group.per_event_fee}
            />
          )}
          {tab === 'members' && (
            <MembersTab
              members={members}
              pendingRequests={pendingRequests}
              group={group}
              currentUserId={currentUserId}
              canManageMembers={isOrganizer}
              onInvite={() => setShareOpen(true)}
            />
          )}
          {tab === 'ranking' && (
            <RankingTab ranking={ranking} currentUserId={currentUserId} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Events Tab ────────────────────────────────────────────────────────────────

function EventsTab({
  upcoming, past, groupId, sport, isOrganizer, perEventFee,
}: {
  upcoming: EventItem[]
  past: EventItem[]
  groupId: string
  sport: string
  isOrganizer: boolean
  perEventFee?: number | null
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
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider my-3">Próximos</p>
          <div className="flex flex-col space-y-3">
            {upcoming.map((event, i) => (
              <EventCard key={event.id} event={event} groupId={groupId} sport={sport} index={i} perEventFee={perEventFee} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Anteriores</p>
          <div className="flex flex-col space-y-2">
            {past.map((event) => (
              <Link key={event.id} href={`/groups/${groupId}/events/${event.id}`}>
                <Card interactive className="flex items-center gap-3 py-3 px-4 rounded-xl">
                  <div className="size-2 rounded-full bg-slate-600 flex-shrink-0" />
                  <span className="text-sm text-slate-400 flex-1">
                    {formatDate(event.starts_at, { weekday: undefined, day: '2-digit', month: '2-digit' })}
                  </span>
                  <span className="text-xs text-slate-500">
                    {event.participant_count}/{event.max_participants}
                  </span>
                  <ChevronRight className="size-4 text-slate-600" />
                </Card>
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

function EventCard({
  event, groupId, sport, index, perEventFee,
}: {
  event: EventItem
  groupId: string
  sport: string
  index: number
  perEventFee?: number | null
}) {
  const slots = event.max_participants - event.participant_count
  const fill = event.participant_count / event.max_participants
  const sportInfo = SPORT_MAP[sport as SportId]
  const durationMin = Math.round(
    (new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000,
  )

  const statusMap: Record<string, { label: string; badge: 'success' | 'warning' | 'error' | 'info' }> = {
    confirmed: { label: 'Confirmado', badge: 'success' },
    pending:   { label: 'Pendente',   badge: 'warning' },
    declined:  { label: 'Recusou',    badge: 'error'   },
    waitlist:  { label: 'Na fila',    badge: 'info'    },
    absent:    { label: 'Ausente',    badge: 'error'   },
    present:   { label: 'Presente',   badge: 'success' },
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
          'rounded-2xl bg-card border p-4 space-y-3',
          event.my_status === 'confirmed' ? 'border-primary/50' : 'border-border',
        )}>
          {myStatusCfg && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/40 border border-primary/40 px-3 py-1 text-xs text-primary font-medium">
              <span className="size-1.5 rounded-full bg-primary" />
              {myStatusCfg.label}
            </span>
          )}

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xl font-bold text-card-foreground">
                {sportInfo?.emoji} {formatDate(event.starts_at, { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </p>
              <p className="text-sm text-muted-foreground truncate">{event.location_name ?? 'Local a definir'}</p>
            </div>
            <span className={cn(
              'rounded-full border text-xs font-semibold px-3 py-1 flex-shrink-0',
              slots > 0 ? 'border-primary/50 text-primary' : 'border-border text-muted-foreground',
            )}>
              {slots > 0 ? 'Aberto' : 'Lotado'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-secondary/50 border border-border p-3">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Horário</p>
              <p className="text-sm font-bold text-card-foreground mt-1">{formatTime(event.starts_at)}</p>
            </div>
            <div className="rounded-xl bg-secondary/50 border border-border p-3">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Duração</p>
              <p className="text-sm font-bold text-card-foreground mt-1">{durationMin} min</p>
            </div>
            <div className="rounded-xl bg-secondary/50 border border-border p-3">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">
                {perEventFee ? 'Valor' : 'Vagas'}
              </p>
              <p className="text-sm font-bold text-card-foreground mt-1">
                {perEventFee ? formatCurrency(perEventFee) : `${event.participant_count}/${event.max_participants}`}
              </p>
            </div>
          </div>

          {event.confirmed_avatars && event.confirmed_avatars.length > 0 && (
            <div className="flex items-center -space-x-2">
              {event.confirmed_avatars.map((p, i) => (
                <div key={i} className="rounded-full border-2 border-card">
                  <Avatar name={p.name} src={p.avatar_url} size="sm" />
                </div>
              ))}
              {event.participant_count > event.confirmed_avatars.length && (
                <div className="size-8 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                  +{event.participant_count - event.confirmed_avatars.length}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-sm mb-1.5 text-foreground">
              {event.participant_count} de {event.max_participants} vagas preenchidas
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(fill, 1) * 100}%` }}
                transition={{ duration: 0.5, delay: index * 0.06 + 0.15 }}
                className={cn('h-full rounded-full', fill >= 1 ? 'bg-warning' : 'bg-primary')}
              />
            </div>
          </div>

          {event.notes && (
            <p className="text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2 leading-relaxed">
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
  members, pendingRequests, group, currentUserId, canManageMembers, onInvite,
}: {
  members: MemberItem[]
  pendingRequests: MemberItem[]
  group: GroupDetail
  currentUserId: string
  canManageMembers: boolean
  onInvite: () => void
}) {
  const router = useRouter()
  const [memberToRemove, setMemberToRemove] = useState<MemberItem | null>(null)
  const [removing, setRemoving] = useState(false)
  const [respondingId, setRespondingId] = useState<string | null>(null)

  const monthly = members.filter((m) => m.member_type === 'monthly')
  const regular = members.filter((m) => m.member_type === 'regular')

  async function handleConfirmRemove() {
    if (!memberToRemove) return
    setRemoving(true)
    const result = await removeMember(group.id, memberToRemove.user_id)
    setRemoving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Membro removido do grupo.')
      setMemberToRemove(null)
      router.refresh()
    }
  }

  async function handleApproveRequest(request: MemberItem) {
    setRespondingId(request.id)
    const result = await approveJoinRequest(group.id, request.user_id)
    setRespondingId(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${request.user.nickname ?? request.user.name} entrou no grupo! ✅`)
      router.refresh()
    }
  }

  async function handleRejectRequest(request: MemberItem) {
    setRespondingId(request.id)
    const result = await rejectJoinRequest(group.id, request.user_id)
    setRespondingId(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast('Solicitação recusada.')
      router.refresh()
    }
  }

  return (
    <div className="space-y-5">
      {canManageMembers && pendingRequests.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Solicitações pendentes</p>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              {pendingRequests.length}
            </span>
          </div>
          <Card className="p-0 overflow-hidden">
            {pendingRequests.map((request, i) => {
              const nickname = request.user.nickname ?? request.user.name.split(' ')[0]
              return (
                <div
                  key={request.id}
                  className={cn('flex items-center gap-3 py-3 px-4', i > 0 && 'border-t border-slate-800')}
                >
                  <Avatar name={request.user.name} src={request.user.avatar_url ?? undefined} size="sm" />
                  <p className="text-sm font-medium text-slate-200 flex-1 truncate">{nickname}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleRejectRequest(request)}
                      disabled={respondingId === request.id}
                      className="size-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
                      aria-label={`Recusar ${nickname}`}
                    >
                      {respondingId === request.id ? (
                        <span className="size-3.5 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />
                      ) : (
                        <X className="size-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleApproveRequest(request)}
                      disabled={respondingId === request.id}
                      className="size-8 flex items-center justify-center rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-colors cursor-pointer disabled:opacity-50"
                      aria-label={`Aprovar ${nickname}`}
                    >
                      {respondingId === request.id ? (
                        <span className="size-3.5 rounded-full border-2 border-primary-400/30 border-t-primary-400 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </Card>
        </section>
      )}

      {group.monthly_fee && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
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
          {!!group.payment_deadline_hours && (
            <p className="text-xs text-slate-500 border-t border-slate-800 pt-2">
              ⏰ Avulso tem até <span className="text-slate-300 font-medium">{group.payment_deadline_hours}h antes do evento</span> pra pagar, senão a vaga é liberada automaticamente.
            </p>
          )}
        </Card>
      )}

      {monthly.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Star className="size-3 text-amber-400 fill-amber-400" /> Mensalistas ({monthly.length})
            </p>
          </div>
          <Card className="p-0 overflow-hidden">
            {monthly.map((m, i) => (
              <MemberRow
                key={m.id}
                member={m}
                index={i}
                showBorder={i > 0}
                currentUserId={currentUserId}
                canManage={canManageMembers && m.user_id !== currentUserId && m.user_id !== group.admin_id}
                onRequestRemove={() => setMemberToRemove(m)}
              />
            ))}
          </Card>
        </section>
      )}

      {regular.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Avulsos ({regular.length})</p>
          <Card className="p-0 overflow-hidden">
            {regular.map((m, i) => (
              <MemberRow
                key={m.id}
                member={m}
                index={i}
                showBorder={i > 0}
                currentUserId={currentUserId}
                canManage={canManageMembers && m.user_id !== currentUserId && m.user_id !== group.admin_id}
                onRequestRemove={() => setMemberToRemove(m)}
              />
            ))}
          </Card>
        </section>
      )}

      {monthly.length === 0 && regular.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-sm text-slate-400">Nenhum membro ainda.</p>
        </div>
      )}

      <Button variant="outline" fullWidth leftIcon={<Plus className="size-4" />} onClick={onInvite}>
        Convidar membro
      </Button>

      <BottomSheet
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="Remover membro"
      >
        {memberToRemove && (
          <div className="space-y-4 pb-2">
            <p className="text-sm text-slate-400 leading-relaxed">
              Remover <span className="text-slate-200 font-medium">{memberToRemove.user.nickname ?? memberToRemove.user.name}</span> do
              grupo? Essa pessoa deixará de ver eventos e precisará de um novo convite pra entrar de novo.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setMemberToRemove(null)} disabled={removing}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleConfirmRemove} loading={removing}>
                Remover
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

function MemberRow({
  member, index, showBorder, currentUserId, canManage, onRequestRemove,
}: {
  member: MemberItem
  index: number
  showBorder: boolean
  currentUserId: string
  canManage: boolean
  onRequestRemove: () => void
}) {
  const isMe = member.user_id === currentUserId
  const nickname = member.user.nickname ?? member.user.name.split(' ')[0]
  const lastPresenceLabel = member.last_presence_at
    ? `Última partida: ${formatDate(member.last_presence_at, { weekday: undefined, day: '2-digit', month: '2-digit' })}`
    : 'Nunca participou'

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
        <Avatar name={member.user.name} src={member.user.avatar_url ?? undefined} size="sm" />
        {member.member_type === 'monthly' && (
          <div className="absolute -top-1 -right-1 size-4 rounded-full bg-amber-500 flex items-center justify-center">
            <Star className="size-2.5 text-white fill-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={cn('text-sm font-medium truncate', isMe ? 'text-primary-300' : 'text-slate-200')}>
            {nickname}
          </p>
          {member.role === 'admin' && <span className="text-[10px] text-amber-400">👑</span>}
          {member.role === 'organizer' && <span className="text-[10px] text-blue-400">🎯</span>}
        </div>
        {member.invited_by && (
          <p className="text-[10px] text-slate-500">
            Convidado por {member.invited_by.nickname ?? member.invited_by.name.split(' ')[0]}
          </p>
        )}
        {member.skill_rating > 0 && (
          <p className="text-[10px] text-amber-500/70">
            {'★'.repeat(member.skill_rating)}{'☆'.repeat(Math.max(0, 5 - member.skill_rating))}
          </p>
        )}
        {canManage && (
          <p className="text-[10px] text-slate-500 mt-0.5">{lastPresenceLabel}</p>
        )}
      </div>

      {canManage && (
        <button
          onClick={onRequestRemove}
          className="size-8 flex-shrink-0 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          aria-label={`Remover ${nickname} do grupo`}
        >
          <UserX className="size-4" />
        </button>
      )}
    </motion.div>
  )
}

// ─── Invite Sheet ──────────────────────────────────────────────────────────────

function InviteSheet({ groupId, isOpen, onClose }: { groupId: string; isOpen: boolean; onClose: () => void }) {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleClose() {
    setCode(null)
    setCopied(false)
    onClose()
  }

  const inviteUrl = code ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${code}` : null

  async function handleGenerate() {
    setLoading(true)
    const result = await createInviteCode(groupId)
    setLoading(false)
    if (result.error) toast.error(result.error)
    else if (result.code) setCode(result.code)
  }

  async function handleCopy() {
    if (!inviteUrl) return
    const ok = await copyToClipboard(inviteUrl)
    if (!ok) {
      toast.error('Não foi possível copiar automaticamente. Selecione o link manualmente.')
      return
    }
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleShare() {
    if (!inviteUrl) return
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: 'Entrar no grupo', url: inviteUrl }).catch(() => null)
    } else {
      handleCopy()
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Convidar para o grupo">
      <div className="space-y-4 pb-2">
        {!code ? (
          <>
            <p className="text-sm text-slate-400 leading-relaxed">
              Gere um link de convite e compartilhe com quem quiser convidar para o grupo.
            </p>
            <Button fullWidth onClick={handleGenerate} loading={loading} leftIcon={<Link2 className="size-4" />}>
              Gerar link de convite
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Link de convite</p>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
              <p className="text-sm text-slate-200 flex-1 truncate font-mono">{inviteUrl}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleCopy}
                leftIcon={copied ? <Check className="size-4" strokeWidth={3} /> : <Copy className="size-4" />}
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
              <Button onClick={handleShare} leftIcon={<Share2 className="size-4" />}>
                Compartilhar
              </Button>
            </div>
            <p className="text-xs text-slate-600 text-center">
              Qualquer pessoa com o link pode entrar no grupo.
            </p>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

// ─── Ranking Tab ───────────────────────────────────────────────────────────────

function RankingTab({ ranking, currentUserId }: { ranking: RankingEntry[]; currentUserId: string }) {
  if (ranking.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-3">🏆</p>
        <p className="text-sm text-slate-400">Nenhuma presença registrada ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        {ranking.map((entry, i) => {
          const isMe = entry.user_id === currentUserId
          const nickname = entry.user.nickname ?? entry.user.name.split(' ')[0]

          return (
            <motion.div
              key={entry.user_id}
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
                {(['🥇', '🥈', '🥉'] as const)[i] ?? i + 1}
              </span>
              <Avatar name={entry.user.name} src={entry.user.avatar_url ?? undefined} size="sm" />
              <p className={cn('flex-1 text-sm font-medium truncate', isMe ? 'text-primary-300' : 'text-slate-200')}>
                {nickname}
                {isMe && <span className="text-xs text-slate-500 ml-1">(você)</span>}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-100">{entry.presences}</span>
                <span className="text-xs text-slate-500">presenças</span>
              </div>
            </motion.div>
          )
        })}
      </Card>
    </div>
  )
}
