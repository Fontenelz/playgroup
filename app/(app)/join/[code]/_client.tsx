'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { ChevronLeft, Users, Lock, Globe, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar, AvatarGroup } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { SportIcon } from '@/components/shared/SportIcon'
import { joinGroup } from '@/lib/actions/groups'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface JoinGroup {
  id: string
  name: string
  description?: string | null
  sport: string
  access_type: string
  monthly_fee?: number | null
  per_event_fee?: number | null
  payment_day?: number | null
}

export interface JoinMember {
  id: string
  role: string
  user: { id: string; name: string; nickname: string | null; avatar_url?: string | null }
}

// ─── Invalid code component ──────────────────────────────────────────────────────

export function InvalidCodeView() {
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
          <p className="text-lg font-bold text-slate-100">Link inválido</p>
          <p className="text-sm text-slate-400 mt-1">
            Este link de convite expirou ou não existe. Peça ao organizador um novo link.
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/home')}>
          Voltar ao início
        </Button>
      </div>
    </div>
  )
}

// ─── Join page client ────────────────────────────────────────────────────────────

interface JoinGroupClientProps {
  code: string
  group: JoinGroup
  memberCount: number
  members: JoinMember[]
  isMember: boolean
}

export default function JoinGroupClient({ code, group, memberCount, members, isMember }: JoinGroupClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)

  const sport = SPORT_MAP[group.sport as SportId]

  async function handleJoin() {
    setLoading(true)
    startTransition(async () => {
      const result = await joinGroup(code)
      setLoading(false)
      if (result?.error) {
        if (result.error === 'Você já é membro deste grupo') {
          router.push(`/groups/${group.id}`)
        } else {
          toast.error(result.error)
        }
      } else {
        setJoined(true)
        toast.success(`Você entrou em ${group.name}! 🎉`)
        // redirect handled by server action
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer -ml-1"
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="text-sm font-semibold text-slate-100">Convite para grupo</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 pb-32 space-y-6">

        {/* ── Group identity ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center gap-4 pt-4"
        >
          <SportIcon sport={group.sport as SportId} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{group.name}</h1>
            <div className="flex items-center justify-center gap-1.5 mt-1 text-slate-400">
              <Users className="size-3.5" />
              <span className="text-sm">{memberCount} membros</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Badge variant="primary" size="sm">{sport?.emoji} {sport?.label}</Badge>
            <Badge variant="neutral" size="sm">
              {group.access_type === 'private'
                ? <><Lock className="size-3 inline mr-1" />Privado</>
                : group.access_type === 'invite'
                ? <><Globe className="size-3 inline mr-1" />Por convite</>
                : <><Globe className="size-3 inline mr-1" />Público</>
              }
            </Badge>
          </div>

          {group.description && (
            <p className="text-sm text-slate-400 max-w-[280px] leading-relaxed">
              {group.description}
            </p>
          )}
        </motion.div>

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-2 gap-3"
        >
          <StatCard value={`${memberCount}`} label="Membros" />
          <StatCard value={sport?.label ?? '—'} label="Esporte" />
        </motion.div>

        {/* ── Members preview ────────────────────────────────────────── */}
        {members.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="size-3.5" />
                Membros
              </p>
              <p className="text-xs text-slate-500">{memberCount} ativos</p>
            </div>

            <div className="flex items-center gap-3">
              <AvatarGroup
                users={members.slice(0, 7).map((m) => ({ name: m.user.name, avatar_url: m.user.avatar_url ?? undefined }))}
                max={7}
                size="sm"
              />
            </div>

            <div className="space-y-2 pt-1">
              {members.slice(0, 3).map((m) => {
                const nickname = m.user.nickname ?? m.user.name.split(' ')[0]
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <Avatar name={m.user.name} src={m.user.avatar_url ?? undefined} size="xs" />
                    <span className="text-xs text-slate-300 flex-1">{nickname}</span>
                    {m.role === 'admin' && (
                      <span className="text-[10px] font-medium text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">admin</span>
                    )}
                  </div>
                )
              })}
              {members.length > 3 && (
                <p className="text-xs text-slate-600">+ {memberCount - 3} outros membros</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Fee info ───────────────────────────────────────────────── */}
        {(group.monthly_fee || group.per_event_fee) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2"
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Financeiro</p>
            {group.monthly_fee && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Mensalidade</span>
                <span className="text-sm font-semibold text-slate-100">
                  R$ {group.monthly_fee.toFixed(2).replace('.', ',')}/mês
                </span>
              </div>
            )}
            {group.per_event_fee && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Avulso/evento</span>
                <span className="text-sm font-semibold text-slate-100">
                  R$ {group.per_event_fee.toFixed(2).replace('.', ',')}/evento
                </span>
              </div>
            )}
            {group.payment_day && (
              <p className="text-xs text-slate-600 mt-1">Vencimento todo dia {group.payment_day}</p>
            )}
          </motion.div>
        )}

        {/* Already member notice */}
        {isMember && (
          <div className="flex items-center gap-3 bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
            <Check className="size-4 text-primary-400 flex-shrink-0" strokeWidth={3} />
            <p className="text-sm text-primary-300">Você já é membro deste grupo.</p>
          </div>
        )}
      </div>

      {/* ── Footer CTA ─────────────────────────────────────────────── */}
      <div className={cn(
        'fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-4 py-4',
        'bg-slate-950/95 backdrop-blur-md border-t border-slate-800/60 space-y-3',
      )}>
        {isMember ? (
          <Button
            fullWidth
            size="lg"
            onClick={() => router.push(`/groups/${group.id}`)}
          >
            Ver grupo
          </Button>
        ) : (
          <>
            <Button
              fullWidth
              size="lg"
              onClick={handleJoin}
              loading={loading}
              leftIcon={joined ? <Check className="size-5" strokeWidth={3} /> : undefined}
            >
              {joined ? 'Entrou!' : `Entrar em ${group.name}`}
            </Button>
            <p className="text-center text-xs text-slate-600">
              Ao entrar, o organizador será notificado.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
      <p className="text-xl font-bold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
