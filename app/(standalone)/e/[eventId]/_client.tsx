'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { ChevronLeft, MapPin, Clock, Users, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { SportIcon } from '@/components/shared/SportIcon'
import { confirmAsGuest } from '@/lib/actions/events'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { formatDate, formatTime } from '@/lib/utils'
import type { GuestEventPreview } from '@/lib/actions/events'

// ─── Invalid event view ──────────────────────────────────────────────────────────

export function InvalidEventView({ message }: { message?: string }) {
  const router = useRouter()
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60 px-4 py-4">
        <button
          onClick={() => router.back()}
          className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer -ml-1"
        >
          <ChevronLeft className="size-5" />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
        <div className="size-16 rounded-2xl bg-red-500/15 flex items-center justify-center">
          <AlertCircle className="size-8 text-red-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-slate-100">Não foi possível abrir o evento</p>
          <p className="text-sm text-slate-400 mt-1">
            {message ?? 'Este link expirou ou não existe.'}
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/home')}>
          Voltar ao início
        </Button>
      </div>
    </div>
  )
}

// ─── Guest RSVP client ────────────────────────────────────────────────────────────

export default function GuestEventClient({ event }: { event: GuestEventPreview }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(event.myStatus)

  const sport = SPORT_MAP[event.sport as SportId]
  const slotsLeft = Math.max(0, event.max_participants - event.participant_count)
  const fill = event.participant_count / event.max_participants
  const confirmed = status === 'confirmed'
  const pending = status === 'pending'

  function handleConfirm() {
    if (!event.hasProfile && !pending && !name.trim()) {
      toast.error('Informe seu nome')
      return
    }
    setLoading(true)
    startTransition(async () => {
      const result = await confirmAsGuest(event.id, name)
      setLoading(false)
      if (result?.error) {
        toast.error(result.error)
      } else if (result.status === 'confirmed') {
        setStatus('confirmed')
        toast.success('Presença confirmada! 🎉')
      } else {
        setStatus('pending')
        toast('Você entrou como pendente. Confirme sua presença para garantir a vaga.', { duration: 5000 })
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">

      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer -ml-1"
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="text-sm font-semibold text-slate-100">Confirmar presença</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 pb-40 space-y-6">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center gap-4 pt-4"
        >
          <SportIcon sport={event.sport as SportId} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{event.title}</h1>
            <p className="text-sm text-slate-400 mt-1">{event.groupName}</p>
          </div>
          <Badge variant="primary" size="sm">{sport?.emoji} {sport?.label}</Badge>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2.5 text-sm text-slate-300">
            <Clock className="size-4 text-slate-500 flex-shrink-0" />
            <span className="capitalize">
              {formatDate(event.starts_at, { weekday: 'long', day: '2-digit', month: 'long' })}
              {' · '}{formatTime(event.starts_at)}–{formatTime(event.ends_at)}
            </span>
          </div>
          {event.location_name && (
            <div className="flex items-center gap-2.5 text-sm text-slate-300">
              <MapPin className="size-4 text-slate-500 flex-shrink-0" />
              <span>{event.location_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 text-sm text-slate-300">
            <Users className="size-4 text-slate-500 flex-shrink-0" />
            <span>{event.participant_count}/{event.max_participants} confirmados</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, fill * 100)}%` }}
            />
          </div>
          {slotsLeft === 0 && !confirmed && (
            <p className="text-xs text-amber-400">Sem vagas no momento — você entra na fila de espera.</p>
          )}
        </motion.div>

        {confirmed && (
          <div className="flex items-center gap-3 bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
            <Check className="size-4 text-primary-400 flex-shrink-0" strokeWidth={3} />
            <p className="text-sm text-primary-300">Presença confirmada para este evento.</p>
          </div>
        )}

        {pending && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <AlertCircle className="size-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-300">
              Você está na lista como pendente. Confirme abaixo pra garantir sua vaga.
            </p>
          </div>
        )}
      </div>

      <div className={
        'fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-4 py-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/60 space-y-3'
      }>
        {confirmed ? (
          <Button fullWidth size="lg" leftIcon={<Check className="size-5" strokeWidth={3} />} disabled>
            Você confirmou presença
          </Button>
        ) : pending || event.hasProfile ? (
          <Button fullWidth size="lg" onClick={handleConfirm} loading={loading}>
            {pending
              ? 'Confirmar presença'
              : event.profileNickname
              ? `Confirmar presença como ${event.profileNickname}`
              : 'Confirmar presença'}
          </Button>
        ) : (
          <>
            <Input
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Button fullWidth size="lg" onClick={handleConfirm} loading={loading}>
              Entrar como pendente
            </Button>
            <p className="text-center text-xs text-slate-600">
              Avulso, sem precisar criar conta.{' '}
              <a href={`/login?next=${encodeURIComponent(`/e/${event.id}`)}`} className="text-primary-400 underline">
                Já tem conta? Entrar
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
