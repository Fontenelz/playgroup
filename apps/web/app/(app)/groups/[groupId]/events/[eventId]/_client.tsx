'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Clock, Users, ChevronDown, ChevronUp,
  Check, X, AlertTriangle, Share2, Shuffle, DollarSign, Link2, Copy,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar, AvatarGroup } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { WaitlistRow } from '@/components/shared/ParticipantRow'
import { SportIcon } from '@/components/shared/SportIcon'
import { confirmParticipation, declineParticipation } from '@/lib/actions/events'
import type { SportId } from '@/lib/constants'
import { formatDate, formatTime, formatCurrency, cn } from '@/lib/utils'
import type { ParticipantStatus } from '@/types/app.types'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface EventFull {
  id: string
  title: string
  sport: string
  starts_at: string
  ends_at: string
  location_name?: string | null
  location_address?: string | null
  max_participants: number
  monthly_slots: number
  participant_count: number
  status: string
  event_fee?: number | null
  notes?: string | null
}

export interface GroupBasic {
  id: string
  name: string
  sport: string
  per_event_fee?: number | null
  my_role: string
}

export interface ParticipantItem {
  id: string
  event_id: string
  user_id: string
  user: { id: string; name: string; nickname: string | null; avatar_url?: string | null }
  status: ParticipantStatus
  is_monthly?: boolean | null
  confirmed_at?: string | null
}

export interface WaitlistItem {
  id: string
  user_id: string
  user: { id: string; name: string; nickname: string | null; avatar_url?: string | null }
  confirmed_at?: string | null
}

interface EventPageClientProps {
  groupId: string
  eventId: string
  currentUserId: string
  event: EventFull
  group: GroupBasic
  participants: ParticipantItem[]
  waitlist: WaitlistItem[]
  declinedParticipants: ParticipantItem[]
  initialMyStatus: ParticipantStatus | null
}

// ─── Cancel reasons ─────────────────────────────────────────────────────────────

type CancelReason = 'work' | 'illness' | 'travel' | 'other'

const cancelReasons: { id: CancelReason; label: string }[] = [
  { id: 'work',    label: 'Trabalho / compromisso' },
  { id: 'illness', label: 'Doença'                  },
  { id: 'travel',  label: 'Viagem'                  },
  { id: 'other',   label: 'Outro motivo'            },
]

// ─── Main component ─────────────────────────────────────────────────────────────

export default function EventPageClient({
  groupId, eventId, currentUserId, event, group,
  participants, waitlist, declinedParticipants, initialMyStatus,
}: EventPageClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [myStatus, setMyStatus]           = useState<ParticipantStatus | null>(initialMyStatus)
  const [participantCount, setParticipantCount] = useState(event.participant_count)
  const [waitlistTimer, setWaitlistTimer] = useState<number | null>(null)

  const [showCancel, setShowCancel]       = useState(false)
  const [cancelReason, setCancelReason]   = useState<CancelReason | null>(null)
  const [showAllConfirmed, setShowAllConfirmed] = useState(false)
  const [showDeclined, setShowDeclined]   = useState(false)
  const [showWaitlist, setShowWaitlist]   = useState(true)
  const [showShare, setShowShare]         = useState(false)
  const [loading, setLoading]             = useState<string | null>(null)

  // Waitlist countdown
  useEffect(() => {
    if (waitlistTimer === null || waitlistTimer <= 0) return
    const interval = setInterval(() => {
      setWaitlistTimer((t) => (t !== null && t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [waitlistTimer])

  const confirmedList = participants.filter((p) => p.status === 'confirmed')
  const slots = event.max_participants - participantCount
  const fill = participantCount / event.max_participants
  const isLate = (() => {
    const hoursUntil = (new Date(event.starts_at).getTime() - Date.now()) / 3600000
    return hoursUntil < 2
  })()
  const isOrganizer = group.my_role === 'admin' || group.my_role === 'organizer'

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (slots <= 0) {
      handleJoinWaitlist()
      return
    }
    setLoading('confirm')
    startTransition(async () => {
      const result = await confirmParticipation(eventId)
      setLoading(null)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setMyStatus('confirmed')
        setParticipantCount((c) => c + 1)
        toast.success('Presença confirmada! ✅')
      }
    })
  }

  async function handleJoinWaitlist() {
    setLoading('waitlist')
    startTransition(async () => {
      const result = await confirmParticipation(eventId)
      setLoading(null)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setMyStatus('pending')
        toast('Você entrou na fila de espera. Avisaremos quando houver vaga! 🕐', { duration: 4000 })
      }
    })
  }

  async function handleLeaveWaitlist() {
    setLoading('leave-waitlist')
    startTransition(async () => {
      const result = await declineParticipation(eventId)
      setLoading(null)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setMyStatus(null)
        setWaitlistTimer(null)
        toast('Você saiu da fila de espera.')
      }
    })
  }

  function openCancelSheet() {
    setCancelReason(null)
    setShowCancel(true)
  }

  async function handleCancel() {
    if (!cancelReason) return
    setLoading('cancel')
    startTransition(async () => {
      const result = await declineParticipation(eventId)
      setLoading(null)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setMyStatus(null)
        setParticipantCount((c) => Math.max(0, c - 1))
        setShowCancel(false)
        if (isLate) {
          toast('⚠️ Cancelamento tardio registrado.', { duration: 4000 })
        } else {
          toast('Participação cancelada.')
        }
      }
    })
  }

  const visibleConfirmed = showAllConfirmed ? confirmedList : confirmedList.slice(0, 5)
  const timerMin = waitlistTimer !== null ? Math.floor(waitlistTimer / 60) : 0
  const timerSec = waitlistTimer !== null ? waitlistTimer % 60 : 0

  return (
    <div className="min-h-screen">
      <Header
        showBack
        backHref={`/groups/${groupId}`}
        rightAction={
          <button
            onClick={() => setShowShare(true)}
            className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <Share2 className="size-4" />
          </button>
        }
      />

      <div className="px-4 pb-8 space-y-4">

        {/* Event hero card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <SportIcon sport={event.sport as SportId} size="md" />
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-slate-100 leading-tight">{group.name}</h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="size-3.5 text-slate-400" />
                  <p className="text-sm text-slate-400">
                    {formatDate(event.starts_at, { weekday: 'long', day: '2-digit', month: 'long' })}
                  </p>
                </div>
                <p className="text-sm text-slate-400 ml-5">
                  {formatTime(event.starts_at)} – {formatTime(event.ends_at)}
                </p>
              </div>
            </div>

            {event.location_name && (
              <div className="flex items-start gap-2 bg-slate-800 rounded-xl px-3 py-2.5 mb-4">
                <MapPin className="size-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-200">{event.location_name}</p>
                  {event.location_address && (
                    <p className="text-xs text-slate-500">{event.location_address}</p>
                  )}
                </div>
              </div>
            )}

            {/* Slots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Users className="size-4" />
                  {participantCount}/{event.max_participants} confirmados
                </span>
                <span className={cn('font-semibold', slots > 0 ? 'text-primary-400' : 'text-amber-400')}>
                  {slots > 0 ? `${slots} vagas` : 'Lotado'}
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${Math.min(fill, 1) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className={cn('h-full rounded-full transition-colors', fill >= 1 ? 'bg-amber-500' : 'bg-primary-500')}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>⭐ {event.monthly_slots} vagas mensalistas</span>
                <span>{event.max_participants - event.monthly_slots} avulsas</span>
              </div>
            </div>
          </div>

          {/* Notes banner */}
          {event.notes && (
            <div className="px-5 py-3 bg-amber-500/5 border-t border-amber-500/20">
              <p className="text-xs text-amber-400">📝 {event.notes}</p>
            </div>
          )}
        </div>

        {/* MY ACTION CARD */}
        <AnimatePresence mode="wait">
          {myStatus === 'confirmed' && (
            <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-2xl p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
                  <Check className="size-5 text-white" strokeWidth={3} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary-300">Você está confirmado!</p>
                  <p className="text-xs text-slate-400">Sua presença está garantida.</p>
                </div>
                <Button size="sm" variant="ghost" onClick={openCancelSheet} className="text-slate-500 text-xs px-2">
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}

          {myStatus === 'pending' && waitlistTimer !== null && (
            <motion.div key="waitlist-called" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🎉</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-300">Vaga disponível!</p>
                    <p className="text-xs text-slate-400">Confirme antes do tempo acabar.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-amber-400 font-mono">
                      {String(timerMin).padStart(2, '0')}:{String(timerSec).padStart(2, '0')}
                    </p>
                    <p className="text-[10px] text-slate-500">restantes</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button fullWidth onClick={handleConfirm} loading={loading === 'confirm'}>
                    Confirmar vaga
                  </Button>
                  <Button variant="ghost" onClick={handleLeaveWaitlist} className="px-3">
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {myStatus === 'pending' && waitlistTimer === null && (
            <motion.div key="waitlist" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="size-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-300">Na fila de espera</p>
                  <p className="text-xs text-slate-400">Avisaremos quando houver vaga.</p>
                </div>
                <Button size="sm" variant="ghost" onClick={handleLeaveWaitlist} loading={loading === 'leave-waitlist'} className="text-xs px-2">
                  Sair
                </Button>
              </div>
            </motion.div>
          )}

          {(myStatus === null || myStatus === 'declined') && (
            <motion.div key="cta" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              {slots > 0 ? (
                <Button fullWidth size="lg" onClick={handleConfirm} loading={loading === 'confirm'} leftIcon={<Check className="size-5" strokeWidth={3} />}>
                  Confirmar Presença
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <AlertTriangle className="size-4 text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-300">Evento lotado. Entre na fila de espera e avisaremos quando houver vaga.</p>
                  </div>
                  <Button fullWidth size="lg" variant="secondary" onClick={handleJoinWaitlist} loading={loading === 'waitlist'}>
                    Entrar na fila de espera
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Organizer actions */}
        {isOrganizer && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Shuffle className="size-3.5" />}
              onClick={() => router.push(`/groups/${groupId}/events/${eventId}/sortear`)}
            >
              Sortear times
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<DollarSign className="size-3.5" />}
              onClick={() => router.push(`/groups/${groupId}/events/${eventId}/financeiro`)}
            >
              Financeiro
            </Button>
          </div>
        )}

        {/* ── CONFIRMED LIST ──────────────────────────────────────────── */}
        <section>
          <button
            onClick={() => setShowAllConfirmed(!showAllConfirmed)}
            className="w-full flex items-center justify-between mb-2 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Confirmados
              </span>
              <span className="text-xs font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">
                {confirmedList.length}/{event.max_participants}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AvatarGroup
                users={confirmedList.slice(0, 4).map((p) => ({ name: p.user.name, avatar_url: p.user.avatar_url ?? undefined }))}
                max={4}
                size="xs"
              />
              {confirmedList.length > 5
                ? showAllConfirmed
                  ? <ChevronUp className="size-4 text-slate-500" />
                  : <ChevronDown className="size-4 text-slate-500" />
                : null
              }
            </div>
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {confirmedList.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">Ninguém confirmou ainda.</p>
            )}
            <AnimatePresence>
              {visibleConfirmed.map((p, i) => {
                const isMe = p.user_id === currentUserId
                const nickname = p.user.nickname ?? p.user.name.split(' ')[0]
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={i > 0 ? 'border-t border-slate-800' : ''}
                  >
                    <div className={cn('flex items-center gap-3 py-3 px-4', isMe && 'bg-primary-500/5 rounded-xl')}>
                      <span className="w-5 text-xs text-slate-500 text-center flex-shrink-0">{i + 1}</span>
                      <Avatar name={p.user.name} src={p.user.avatar_url ?? undefined} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', isMe ? 'text-primary-300' : 'text-slate-200')}>
                          {nickname}
                          {isMe && <span className="text-xs text-slate-500 ml-1">(você)</span>}
                        </p>
                        {p.is_monthly && (
                          <p className="text-[11px] text-amber-500/80">⭐ Mensalista</p>
                        )}
                      </div>
                      <Badge variant="success" size="sm">Confirmado</Badge>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {confirmedList.length > 5 && (
              <button
                onClick={() => setShowAllConfirmed(!showAllConfirmed)}
                className="w-full py-3 text-xs text-slate-500 hover:text-primary-400 transition-colors border-t border-slate-800 cursor-pointer"
              >
                {showAllConfirmed
                  ? 'Mostrar menos'
                  : `Ver mais ${confirmedList.length - 5} confirmados`}
              </button>
            )}
          </div>
        </section>

        {/* ── WAITLIST ─────────────────────────────────────────────────── */}
        {waitlist.length > 0 && (
          <section>
            <button
              onClick={() => setShowWaitlist(!showWaitlist)}
              className="w-full flex items-center justify-between mb-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fila de espera</span>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  {waitlist.length}
                </span>
              </div>
              {showWaitlist
                ? <ChevronUp className="size-4 text-slate-500" />
                : <ChevronDown className="size-4 text-slate-500" />
              }
            </button>

            <AnimatePresence>
              {showWaitlist && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    {waitlist.map((w, i) => (
                      <div key={w.id} className={cn(i > 0 && 'border-t border-slate-800')}>
                        <WaitlistRow
                          position={i + 1}
                          name={w.user.nickname ?? w.user.name.split(' ')[0]}
                          avatarUrl={w.user.avatar_url ?? undefined}
                          joinedAt={w.confirmed_at ?? new Date().toISOString()}
                          status="waiting"
                          isMe={w.user_id === currentUserId}
                        />
                      </div>
                    ))}
                    <div className="px-4 py-3 border-t border-slate-800 bg-slate-800/30">
                      <p className="text-xs text-slate-500">
                        🔔 Notificação automática ao abrir vaga · Prazo de 30 min para confirmar
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* ── DECLINED ─────────────────────────────────────────────────── */}
        {declinedParticipants.length > 0 && (
          <section>
            <button
              onClick={() => setShowDeclined(!showDeclined)}
              className="w-full flex items-center justify-between mb-2 cursor-pointer"
            >
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Recusaram ({declinedParticipants.length})
              </span>
              {showDeclined
                ? <ChevronUp className="size-4 text-slate-600" />
                : <ChevronDown className="size-4 text-slate-600" />
              }
            </button>

            <AnimatePresence>
              {showDeclined && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                    {declinedParticipants.map((p, i) => (
                      <div key={p.id} className={i > 0 ? 'border-t border-slate-800' : ''}>
                        <div className="flex items-center gap-3 px-4 py-3 opacity-50">
                          <Avatar name={p.user.name} src={p.user.avatar_url ?? undefined} size="sm" />
                          <p className="text-sm text-slate-400 flex-1">
                            {p.user.nickname ?? p.user.name.split(' ')[0]}
                          </p>
                          <Badge variant="error" size="sm">Recusou</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* ── PAYMENT INFO ────────────────────────────────────────────── */}
        {group.per_event_fee && myStatus !== 'confirmed' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <p className="text-sm font-semibold text-slate-100">
                {formatCurrency(group.per_event_fee)} por evento
              </p>
              <p className="text-xs text-slate-500">
                Pagamento via PIX após confirmação.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── CANCEL BOTTOM SHEET ─────────────────────────────────────────────── */}
      <BottomSheet
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancelar participação"
      >
        <div className="space-y-4">
          {isLate && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle className="size-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">
                Você está cancelando com menos de 2h de antecedência. Isso pode gerar uma penalidade registrada no seu histórico.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-slate-400">Por que você está cancelando?</p>
            {cancelReasons.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setCancelReason(id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left cursor-pointer',
                  cancelReason === id
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-slate-700 hover:border-slate-600',
                )}
              >
                <div className={cn(
                  'size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  cancelReason === id ? 'border-primary-500 bg-primary-500' : 'border-slate-600',
                )}>
                  {cancelReason === id && <div className="size-1.5 rounded-full bg-white" />}
                </div>
                <span className={cn('text-sm', cancelReason === id ? 'text-primary-300' : 'text-slate-300')}>
                  {label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" fullWidth onClick={() => setShowCancel(false)}>
              Manter presença
            </Button>
            <Button
              variant="danger"
              fullWidth
              disabled={!cancelReason}
              loading={loading === 'cancel'}
              onClick={handleCancel}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </BottomSheet>

      <EventShareSheet eventId={eventId} isOpen={showShare} onClose={() => setShowShare(false)} />
    </div>
  )
}

// ─── Event Share Sheet ──────────────────────────────────────────────────────────

function EventShareSheet({ eventId, isOpen, onClose }: { eventId: string; isOpen: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const eventUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/e/${eventId}`

  async function handleCopy() {
    await navigator.clipboard.writeText(eventUrl)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleShare() {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: 'Confirmar presença no evento', url: eventUrl }).catch(() => null)
    } else {
      handleCopy()
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Compartilhar evento">
      <div className="space-y-4 pb-2">
        <p className="text-sm text-slate-400 leading-relaxed">
          Qualquer pessoa com esse link pode confirmar presença avulsa neste evento, sem precisar entrar no grupo
          (caso ele não seja privado).
        </p>
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5">
          <Link2 className="size-4 text-slate-500 flex-shrink-0" />
          <span className="text-sm text-slate-300 truncate flex-1">{eventUrl}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth leftIcon={<Copy className="size-4" />} onClick={handleCopy}>
            {copied ? 'Copiado!' : 'Copiar link'}
          </Button>
          <Button fullWidth onClick={handleShare}>
            Compartilhar
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
