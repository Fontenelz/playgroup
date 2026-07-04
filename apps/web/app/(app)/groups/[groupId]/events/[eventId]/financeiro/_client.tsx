'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { ChevronLeft, Check, Clock, MessageCircle, DollarSign, TrendingUp } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { formatCurrency, cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────────

type LocalPaymentStatus = 'paid' | 'pending'

export interface FinanceiroParticipant {
  id: string
  user_id: string
  name: string
  nickname: string
  avatar_url?: string | null
  is_monthly: boolean
}

interface FinanceiroClientProps {
  eventTitle: string
  fee: number
  participants: FinanceiroParticipant[]
}

type FilterTab = 'all' | 'paid' | 'pending'

// ─── Main component ──────────────────────────────────────────────────────────────

export default function FinanceiroClient({ eventTitle, fee, participants }: FinanceiroClientProps) {
  const router = useRouter()

  // Payment state is local only (no payments table in schema)
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, LocalPaymentStatus>>(
    Object.fromEntries(participants.map((p) => [p.id, 'pending'])),
  )

  const [filter, setFilter]         = useState<FilterTab>('all')
  const [confirmSheet, setConfirmSheet] = useState<FinanceiroParticipant | null>(null)
  const [loadingId, setLoadingId]   = useState<string | null>(null)

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const paid    = participants.filter((p) => paymentStatuses[p.id] === 'paid').length
    const pending = participants.filter((p) => paymentStatuses[p.id] === 'pending').length
    const total   = participants.length

    return {
      paid,
      pending,
      total,
      collectedAmount: paid * fee,
      expectedAmount:  total * fee,
      pendingAmount:   pending * fee,
      pct: total > 0 ? Math.round((paid / total) * 100) : 0,
    }
  }, [participants, paymentStatuses, fee])

  const filtered = useMemo(() => {
    if (filter === 'paid')    return participants.filter((p) => paymentStatuses[p.id] === 'paid')
    if (filter === 'pending') return participants.filter((p) => paymentStatuses[p.id] === 'pending')
    return participants
  }, [participants, paymentStatuses, filter])

  // ── Actions ──────────────────────────────────────────────────────────────
  async function markAsPaid(p: FinanceiroParticipant) {
    setLoadingId(p.id)
    await new Promise((r) => setTimeout(r, 600))
    setPaymentStatuses((prev) => ({ ...prev, [p.id]: 'paid' }))
    setLoadingId(null)
    setConfirmSheet(null)
    toast.success(`${p.nickname} marcado como pago ✅`)
  }

  async function sendReminder(p: FinanceiroParticipant) {
    setLoadingId(p.id)
    await new Promise((r) => setTimeout(r, 800))
    setLoadingId(null)
    toast.success(`Cobrança enviada para ${p.nickname} 📲`)
  }

  async function sendBulkReminder() {
    const targets = participants.filter((p) => paymentStatuses[p.id] !== 'paid')
    if (targets.length === 0) { toast('Todos já pagaram! 🎉'); return }
    await new Promise((r) => setTimeout(r, 900))
    toast.success(`Cobrança enviada para ${targets.length} participantes 📲`)
  }

  const FILTER_TABS: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all',     label: 'Todos',     count: stats.total   },
    { id: 'paid',    label: 'Pagos',     count: stats.paid    },
    { id: 'pending', label: 'Pendentes', count: stats.pending },
  ]

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
          <div>
            <p className="text-xs text-slate-400">Financeiro</p>
            <p className="text-sm font-semibold text-slate-100 truncate max-w-[220px]">{eventTitle}</p>
          </div>
          <button
            onClick={sendBulkReminder}
            className="ml-auto flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
          >
            <MessageCircle className="size-3.5" />
            Cobrar todos
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-5 pb-24">

        {/* ── Summary card ─────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="h-2 bg-slate-800">
            <motion.div
              className="h-full bg-primary-500 rounded-r-full"
              initial={{ width: 0 }}
              animate={{ width: `${stats.pct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Arrecadado</p>
                <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.collectedAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Esperado</p>
                <p className="text-lg font-semibold text-slate-400">{formatCurrency(stats.expectedAmount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Pagos"     value={stats.paid}    color="text-emerald-400" bg="bg-emerald-500/10" />
              <StatBox label="Pendentes" value={stats.pending} color="text-amber-400"   bg="bg-amber-500/10"   />
            </div>

            {stats.pendingAmount > 0 && (
              <div className="flex items-center gap-2 bg-amber-500/10 rounded-xl px-3 py-2.5">
                <TrendingUp className="size-4 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-300">
                  <span className="font-bold">{formatCurrency(stats.pendingAmount)}</span> ainda a receber de {stats.pending} participante{stats.pending !== 1 ? 's' : ''}.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Filter tabs ──────────────────────────────────────────── */}
        <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl">
          {FILTER_TABS.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer',
                filter === id
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-500 hover:text-slate-400',
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  filter === id ? 'bg-slate-600 text-slate-200' : 'bg-slate-800 text-slate-500',
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Participant list ─────────────────────────────────────── */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((p) => {
              const isPaid = paymentStatuses[p.id] === 'paid'
              const isLoading = loadingId === p.id

              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3.5"
                >
                  <Avatar name={p.name} src={p.avatar_url ?? undefined} size="sm" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-100 truncate">{p.nickname}</p>
                      {p.is_monthly && (
                        <span className="text-[10px] text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full font-medium leading-none">
                          mensalista
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isPaid ? (
                        <Badge variant="success" size="sm">
                          <span className="flex items-center gap-1"><Check className="size-3" />Pago</span>
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          <span className="flex items-center gap-1"><Clock className="size-3" />Pendente</span>
                        </Badge>
                      )}
                      {fee > 0 && (
                        <span className="text-xs text-slate-500">{formatCurrency(fee)}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isPaid ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => sendReminder(p)}
                        disabled={isLoading}
                        className="size-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-300 transition-all cursor-pointer disabled:opacity-50"
                        title="Cobrar"
                      >
                        <MessageCircle className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmSheet(p)}
                        disabled={isLoading}
                        className="size-8 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 flex items-center justify-center text-primary-400 hover:text-primary-300 transition-all cursor-pointer disabled:opacity-50"
                        title="Marcar como pago"
                      >
                        {isLoading
                          ? <span className="size-3.5 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
                          : <DollarSign className="size-3.5" />
                        }
                      </button>
                    </div>
                  ) : (
                    <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <Check className="size-3.5 text-emerald-400" strokeWidth={3} />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-slate-400 text-sm font-medium">Nenhum participante nesta categoria</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm payment bottom sheet */}
      <BottomSheet
        isOpen={!!confirmSheet}
        onClose={() => setConfirmSheet(null)}
        title="Confirmar pagamento"
      >
        {confirmSheet && (
          <div className="space-y-5 pb-2">
            <div className="flex items-center gap-3 bg-slate-800 rounded-xl p-4">
              <Avatar name={confirmSheet.name} src={confirmSheet.avatar_url ?? undefined} size="md" />
              <div>
                <p className="font-semibold text-slate-100">{confirmSheet.nickname}</p>
                <p className="text-sm text-slate-400">{confirmSheet.name}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-500">Valor</p>
                <p className="text-lg font-bold text-primary-400">{formatCurrency(fee)}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400">
              Confirmar que <span className="font-semibold text-slate-200">{confirmSheet.nickname}</span> realizou o pagamento de <span className="font-semibold text-primary-400">{formatCurrency(fee)}</span>?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setConfirmSheet(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => markAsPaid(confirmSheet)}
                loading={loadingId === confirmSheet.id}
                leftIcon={<Check className="size-4" strokeWidth={3} />}
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

function StatBox({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={cn('rounded-xl px-3 py-2.5 text-center', bg)}>
      <p className={cn('text-xl font-bold', color)}>{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
