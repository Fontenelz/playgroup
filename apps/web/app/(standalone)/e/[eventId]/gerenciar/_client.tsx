'use client'

import { useState, useTransition } from 'react'
import { MapPin, Clock, Users, Shuffle, Share2, Link2, Copy, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SportIcon } from '@/components/shared/SportIcon'
import type { SportId } from '@/lib/constants'
import { formatDate, formatTime, cn, copyToClipboard } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { approveParticipant, rejectParticipant } from '@/lib/actions/events'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ManageEventFull {
  id: string
  title: string
  sport: string
  starts_at: string
  ends_at: string
  location_name?: string | null
  location_address?: string | null
  max_participants: number
  participant_count: number
  notes?: string | null
}

export interface ManageParticipantItem {
  id: string
  user_id: string
  user: { id: string; name: string; nickname: string | null; avatar_url?: string | null }
}

interface ManageEventClientProps {
  eventId: string
  event: ManageEventFull
  visibility: 'link_only' | 'public' | null
  participants: ManageParticipantItem[]
  waitlist: ManageParticipantItem[]
  declinedParticipants: ManageParticipantItem[]
}

export default function ManageEventClient({
  eventId, event, visibility, participants: initialParticipants, waitlist: initialWaitlist, declinedParticipants,
}: ManageEventClientProps) {
  const router = useRouter()
  const [showShare, setShowShare] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const [participants, setParticipants] = useState(initialParticipants)
  const [waitlist, setWaitlist] = useState(initialWaitlist)
  const [participantCount, setParticipantCount] = useState(event.participant_count)

  const slots = event.max_participants - participantCount

  function handleApprove(p: ManageParticipantItem) {
    setLoadingId(p.id)
    startTransition(async () => {
      const result = await approveParticipant(eventId, p.user_id)
      setLoadingId(null)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      setWaitlist((w) => w.filter((x) => x.id !== p.id))
      setParticipants((c) => [...c, p])
      setParticipantCount((c) => c + 1)
      toast.success(`${p.user.nickname ?? p.user.name} confirmado! ✅`)
    })
  }

  function handleReject(p: ManageParticipantItem) {
    setLoadingId(p.id)
    startTransition(async () => {
      const result = await rejectParticipant(eventId, p.user_id)
      setLoadingId(null)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      setWaitlist((w) => w.filter((x) => x.id !== p.id))
      toast('Participação recusada.')
    })
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Gerenciar evento"
        showBack
        backHref={`/e/${eventId}`}
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

        {/* Event summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <SportIcon sport={event.sport as SportId} size="md" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-slate-100 leading-tight">{event.title}</h1>
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
            <Badge variant={visibility === 'public' ? 'primary' : 'neutral'} size="sm">
              {visibility === 'public' ? 'Público' : 'Só com link'}
            </Badge>
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

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Users className="size-4" />
              {participantCount}/{event.max_participants} confirmados
            </span>
            <span className={cn('font-semibold', slots > 0 ? 'text-primary-400' : 'text-amber-400')}>
              {slots > 0 ? `${slots} vagas` : 'Lotado'}
            </span>
          </div>

          {event.notes && (
            <p className="text-xs text-amber-400 mt-3">📝 {event.notes}</p>
          )}
        </div>

        <Button
          fullWidth
          variant="outline"
          leftIcon={<Shuffle className="size-4" />}
          onClick={() => router.push(`/e/${eventId}/sortear`)}
        >
          Sortear times
        </Button>

        {/* Confirmed */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirmados</span>
            <span className="text-xs font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">
              {participants.length}/{event.max_participants}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {participants.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">Ninguém confirmou ainda.</p>
            )}
            {participants.map((p, i) => (
              <div key={p.id} className={cn('flex items-center gap-3 py-3 px-4', i > 0 && 'border-t border-slate-800')}>
                <span className="w-5 text-xs text-slate-500 text-center flex-shrink-0">{i + 1}</span>
                <Avatar name={p.user.name} src={p.user.avatar_url ?? undefined} size="sm" />
                <p className="text-sm font-medium text-slate-200 flex-1 truncate">
                  {p.user.nickname ?? p.user.name.split(' ')[0]}
                </p>
                <Badge variant="success" size="sm">Confirmado</Badge>
              </div>
            ))}
          </div>
        </section>

        {/* Pending */}
        {waitlist.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {visibility === 'public' ? 'Pendentes de aprovação' : 'Pendentes'}
              </span>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                {waitlist.length}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {waitlist.map((p, i) => (
                <div key={p.id} className={cn('flex items-center gap-3 py-3 px-4', i > 0 && 'border-t border-slate-800')}>
                  <Avatar name={p.user.name} src={p.user.avatar_url ?? undefined} size="sm" />
                  <p className="text-sm font-medium text-slate-200 flex-1 truncate">
                    {p.user.nickname ?? p.user.name.split(' ')[0]}
                  </p>
                  {visibility === 'public' ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleReject(p)}
                        disabled={isPending}
                        className="size-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {loadingId === p.id ? (
                          <span className="size-3.5 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />
                        ) : (
                          <X className="size-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleApprove(p)}
                        disabled={isPending}
                        className="size-8 flex items-center justify-center rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {loadingId === p.id ? (
                          <span className="size-3.5 rounded-full border-2 border-primary-400/30 border-t-primary-400 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <Badge variant="warning" size="sm">Pendente</Badge>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Declined */}
        {declinedParticipants.length > 0 && (
          <section>
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Recusaram ({declinedParticipants.length})
            </span>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden mt-2">
              {declinedParticipants.map((p, i) => (
                <div key={p.id} className={cn('flex items-center gap-3 px-4 py-3 opacity-50', i > 0 && 'border-t border-slate-800')}>
                  <Avatar name={p.user.name} src={p.user.avatar_url ?? undefined} size="sm" />
                  <p className="text-sm text-slate-400 flex-1">
                    {p.user.nickname ?? p.user.name.split(' ')[0]}
                  </p>
                  <Badge variant="error" size="sm">Recusou</Badge>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <EventShareSheet eventId={eventId} isOpen={showShare} onClose={() => setShowShare(false)} />
    </div>
  )
}

// ─── Share sheet ────────────────────────────────────────────────────────────────

function EventShareSheet({ eventId, isOpen, onClose }: { eventId: string; isOpen: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const eventUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/e/${eventId}`

  async function handleCopy() {
    const ok = await copyToClipboard(eventUrl)
    if (!ok) {
      toast.error('Não foi possível copiar automaticamente. Selecione o link manualmente.')
      return
    }
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
          Qualquer pessoa com esse link pode confirmar presença neste evento avulso.
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
