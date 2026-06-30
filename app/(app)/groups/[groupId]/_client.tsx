'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Settings, Share2, Star, ChevronRight, Copy, Check, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { SportIcon } from '@/components/shared/SportIcon'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { createInviteCode } from '@/lib/actions/groups'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { formatDate, formatTime, formatCurrency, cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GroupDetail {
  id: string
  name: string
  description?: string | null
  sport: string
  monthly_fee?: number | null
  per_event_fee?: number | null
  payment_day?: number | null
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
}

export interface MemberItem {
  id: string
  role: string
  member_type: string
  skill_rating: number
  user_id: string
  user: { id: string; name: string; nickname: string | null; avatar_url?: string | null }
}

export interface RankingEntry {
  user_id: string
  user: { id: string; name: string; nickname: string | null; avatar_url?: string | null }
  presences: number
}

interface GroupPageClientProps {
  groupId: string
  currentUserId: string
  group: GroupDetail
  myRole: string
  memberCount: number
  events: EventItem[]
  members: MemberItem[]
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
  ranking,
}: GroupPageClientProps) {
  const [tab, setTab] = useState<Tab>('events')
  const [shareOpen, setShareOpen] = useState(false)

  const sport = SPORT_MAP[group.sport as SportId]
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
          <div className="flex gap-1">
            <button
              onClick={() => setShareOpen(true)}
              className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 cursor-pointer"
            >
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
            <SportIcon sport={group.sport as SportId} size="lg" className="mb-3" />
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
              isOrganizer={isOrganizer}
            />
          )}
          {tab === 'members' && (
            <MembersTab members={members} group={group} currentUserId={currentUserId} onInvite={() => setShareOpen(true)} />
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
  upcoming, past, groupId, isOrganizer,
}: {
  upcoming: EventItem[]
  past: EventItem[]
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
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider my-3">Próximos</p>
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

function EventCard({ event, groupId, index }: { event: EventItem; groupId: string; index: number }) {
  const slots = event.max_participants - event.participant_count
  const fill = event.participant_count / event.max_participants

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
  members, group, currentUserId, onInvite,
}: {
  members: MemberItem[]
  group: GroupDetail
  currentUserId: string
  onInvite: () => void
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
              <MemberRow key={m.id} member={m} index={i} showBorder={i > 0} currentUserId={currentUserId} />
            ))}
          </div>
        </section>
      )}

      {regular.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Avulsos ({regular.length})</p>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {regular.map((m, i) => (
              <MemberRow key={m.id} member={m} index={i} showBorder={i > 0} currentUserId={currentUserId} />
            ))}
          </div>
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
    </div>
  )
}

function MemberRow({
  member, index, showBorder, currentUserId,
}: {
  member: MemberItem
  index: number
  showBorder: boolean
  currentUserId: string
}) {
  const isMe = member.user_id === currentUserId
  const nickname = member.user.nickname ?? member.user.name.split(' ')[0]

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
        {member.skill_rating > 0 && (
          <p className="text-[10px] text-amber-500/70">
            {'★'.repeat(member.skill_rating)}{'☆'.repeat(Math.max(0, 5 - member.skill_rating))}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Invite Sheet ──────────────────────────────────────────────────────────────

function InviteSheet({ groupId, isOpen, onClose }: { groupId: string; isOpen: boolean; onClose: () => void }) {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) { setCode(null); setCopied(false) }
  }, [isOpen])

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
    await navigator.clipboard.writeText(inviteUrl)
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Convidar para o grupo">
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
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
      </div>
    </div>
  )
}
