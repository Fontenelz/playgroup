'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Clock, Users, ChevronDown, ChevronUp,
  Check, X, AlertTriangle, Share2, Shuffle, DollarSign,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar, AvatarGroup } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ParticipantRow, WaitlistRow } from '@/components/shared/ParticipantRow'
import { SportIcon } from '@/components/shared/SportIcon'
import {
  MOCK_EVENTS, MOCK_PARTICIPANTS, MOCK_WAITLIST, MOCK_GROUPS,
} from '@/data/mock'
import { formatDate, formatTime, formatCurrency, cn } from '@/lib/utils'
import type { ParticipantStatus } from '@/types/app.types'

type CancelReason = 'work' | 'illness' | 'travel' | 'other'

const cancelReasons: { id: CancelReason; label: string }[] = [
  { id: 'work',    label: 'Trabalho / compromisso' },
  { id: 'illness', label: 'Doença'                  },
  { id: 'travel',  label: 'Viagem'                  },
  { id: 'other',   label: 'Outro motivo'            },
]

export default function EventPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>
}) {
  const { groupId, eventId } = use(params)
  const router = useRouter()

  const event  = MOCK_EVENTS.find((e) => e.id === eventId) ?? MOCK_EVENTS[0]
  const group  = MOCK_GROUPS.find((g) => g.id === groupId) ?? MOCK_GROUPS[0]

  // ── Local state (simulates real-time) ──────────────────────────────────────
  const [myStatus, setMyStatus]       = useState<ParticipantStatus | null>(event.my_status ?? null)
  const [participants, setParticipants] = useState(
    MOCK_PARTICIPANTS.filter((p) => p.event_id === event.id && p.status !== 'declined')
  )
  const [declined, setDeclined]         = useState(
    MOCK_PARTICIPANTS.filter((p) => p.event_id === event.id && p.status === 'declined')
  )
  const [waitlist, setWaitlist]         = useState(MOCK_WAITLIST)
  const [participantCount, setParticipantCount] = useState(event.participant_count)

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showCancel, setShowCancel]         = useState(false)
  const [cancelReason, setCancelReason]     = useState<CancelReason | null>(null)
  const [showAllConfirmed, setShowAllConfirmed] = useState(false)
  const [showDeclined, setShowDeclined]     = useState(false)
  const [showWaitlist, setShowWaitlist]     = useState(true)
  const [loading, setLoading]               = useState<string | null>(null)
  const [waitlistTimer, setWaitlistTimer]   = useState<number | null>(null)

  // Waitlist countdown (simula notificação recebida)
  useEffect(() => {
    if (myStatus === 'waitlist') {
      const t = setTimeout(() => {
        toast('🎉 Uma vaga abriu! Confirme em 30 minutos.', { duration: 6000 })
        setMyStatus('waitlist') // stays on waitlist until they confirm
        setWaitlistTimer(30 * 60) // 30 min in seconds
      }, 8000)
      return () => clearTimeout(t)
    }
  }, [myStatus])

  useEffect(() => {
    if (waitlistTimer === null || waitlistTimer <= 0) return
    const interval = setInterval(() => {
      setWaitlistTimer((t) => (t !== null && t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [waitlistTimer])

  const confirmedList = participants.filter((p) => p.status === 'confirmed')
  const slots         = event.max_participants - participantCount
  const fill          = participantCount / event.max_participants
  const isLate        = (() => {
    const hoursUntil = (new Date(event.starts_at).getTime() - Date.now()) / 3600000
    return hoursUntil < 2
  })()
  const isOrganizer   = group.my_role === 'admin' || group.my_role === 'organizer'

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (slots <= 0) {
      handleJoinWaitlist()
      return
    }
    setLoading('confirm')
    await new Promise((r) => setTimeout(r, 700))

    const me = {
      id: 'ep-me',
      event_id: event.id,
      user_id: 'user-matheus',
      user: { id: 'user-matheus', name: 'Matheus Wirino', nickname: 'Matheus', avatar_url: undefined },
      status: 'confirmed' as const,
      is_monthly: true,
      confirmed_at: new Date().toISOString(),
      goals: 0,
      assists: 0,
      payment_status: 'paid' as const,
    }

    setMyStatus('confirmed')
    setParticipants((prev) => {
      const exists = prev.find((p) => p.user_id === 'user-matheus')
      if (exists) return prev.map((p) => p.user_id === 'user-matheus' ? { ...p, status: 'confirmed' as const } : p)
      return [...prev, me]
    })
    setParticipantCount((c) => c + 1)
    setLoading(null)
    toast.success('Presença confirmada! ✅')
  }

  async function handleJoinWaitlist() {
    setLoading('waitlist')
    await new Promise((r) => setTimeout(r, 700))
    setMyStatus('waitlist')
    setLoading(null)
    toast('Você entrou na fila de espera. Avisaremos quando houver vaga! 🕐', { duration: 4000 })
  }

  async function handleLeaveWaitlist() {
    setLoading('leave-waitlist')
    await new Promise((r) => setTimeout(r, 500))
    setMyStatus(null)
    setWaitlistTimer(null)
    setLoading(null)
    toast('Você saiu da fila de espera.')
  }

  async function handleConfirmFromWaitlist() {
    setLoading('confirm-waitlist')
    await new Promise((r) => setTimeout(r, 700))
    setMyStatus('confirmed')
    setParticipantCount((c) => c + 1)
    setWaitlistTimer(null)
    setLoading(null)
    toast.success('Presença confirmada da fila! 🎉')
  }

  function openCancelSheet() {
    setCancelReason(null)
    setShowCancel(true)
  }

  async function handleCancel() {
    if (!cancelReason) return
    setLoading('cancel')
    await new Promise((r) => setTimeout(r, 700))

    setMyStatus(null)
    setParticipants((prev) => prev.filter((p) => p.user_id !== 'user-matheus'))
    setParticipantCount((c) => Math.max(0, c - 1))

    // Simulate notifying waitlist
    if (waitlist.length > 0) {
      setTimeout(() => {
        toast(`🔔 ${waitlist[0].user.nickname} foi notificado da vaga!`, { duration: 4000 })
        setWaitlist((prev) =>
          prev.map((w, i) => i === 0 ? { ...w, status: 'notified' as const, expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() } : w)
        )
      }, 1500)
    }

    setLoading(null)
    setShowCancel(false)
    if (isLate) {
      toast('⚠️ Cancelamento tardio registrado.', { duration: 4000 })
    } else {
      toast('Participação cancelada.')
    }
  }

  async function handleRemoveFromWaitlist(userId: string) {
    setWaitlist((prev) => {
      const filtered = prev.filter((w) => w.user_id !== userId)
      return filtered.map((w, i) => ({ ...w, position: i + 1 }))
    })
    toast('Removido da fila.')
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const visibleConfirmed = showAllConfirmed ? confirmedList : confirmedList.slice(0, 5)
  const timerMin = waitlistTimer !== null ? Math.floor(waitlistTimer / 60) : 0
  const timerSec = waitlistTimer !== null ? waitlistTimer % 60 : 0

  return (
    <div className="min-h-screen">
      <Header
        showBack
        backHref={`/groups/${groupId}`}
        rightAction={
          <button className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 cursor-pointer">
            <Share2 className="size-4" />
          </button>
        }
      />

      <div className="px-4 pb-8 space-y-4">

        {/* Event hero card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <SportIcon sport={event.sport} size="md" />
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

          {myStatus === 'waitlist' && waitlistTimer !== null && (
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
                  <Button fullWidth onClick={handleConfirmFromWaitlist} loading={loading === 'confirm-waitlist'}>
                    Confirmar vaga
                  </Button>
                  <Button variant="ghost" onClick={handleLeaveWaitlist} className="px-3">
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {myStatus === 'waitlist' && waitlistTimer === null && (
            <motion.div key="waitlist" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="size-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-300">Você está na fila de espera</p>
                  <p className="text-xs text-slate-400">
                    Posição {(waitlist.findIndex((w) => w.user_id === 'user-matheus') + 1) || waitlist.length + 1}ª — Avisaremos quando houver vaga.
                  </p>
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
                users={confirmedList.slice(0, 4).map((p) => ({ name: p.user.name, avatar_url: p.user.avatar_url }))}
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
              {visibleConfirmed.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={i > 0 ? 'border-t border-slate-800' : ''}
                >
                  <ParticipantRow
                    participant={p}
                    position={i + 1}
                    isMe={p.user_id === 'user-matheus'}
                    showPayment={isOrganizer}
                  />
                </motion.div>
              ))}
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
                          position={w.position}
                          name={w.user.nickname}
                          avatarUrl={w.user.avatar_url}
                          joinedAt={w.joined_at}
                          status={w.status}
                          expiresAt={w.expires_at}
                          isMe={w.user_id === 'user-matheus'}
                        />
                        {isOrganizer && w.user_id !== 'user-matheus' && (
                          <div className="px-4 pb-3 flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-red-400 hover:text-red-300 px-2"
                              onClick={() => handleRemoveFromWaitlist(w.user_id)}
                            >
                              Remover da fila
                            </Button>
                          </div>
                        )}
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
        {declined.length > 0 && (
          <section>
            <button
              onClick={() => setShowDeclined(!showDeclined)}
              className="w-full flex items-center justify-between mb-2 cursor-pointer"
            >
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Recusaram ({declined.length})
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
                    {declined.map((p, i) => (
                      <div key={p.id} className={i > 0 ? 'border-t border-slate-800' : ''}>
                        <div className="flex items-center gap-3 px-4 py-3 opacity-50">
                          <Avatar name={p.user.name} src={p.user.avatar_url} size="sm" />
                          <p className="text-sm text-slate-400 flex-1">{p.user.nickname}</p>
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
    </div>
  )
}
