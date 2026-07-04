'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { ChevronLeft, Calendar, Clock, MapPin, Users, FileText, ChevronRight, Check, Link2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { StepBar } from '@/components/ui/StepBar'
import { SportIcon } from '@/components/shared/SportIcon'
import { SPORTS } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { createStandaloneEvent } from '@/lib/actions/events'

// ── Types ─────────────────────────────────────────────────────────────────────

type Visibility = 'link_only' | 'public'

interface EventForm {
  sport: SportId
  date: string
  startTime: string
  endTime: string
  locationName: string
  locationAddress: string
  maxParticipants: number
  visibility: Visibility
  notes: string
}

const STEP_LABELS = ['Esporte', 'Onde', 'Detalhes']
const TOTAL_STEPS = 3

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatDatePretty(dateStr: string): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date(dateStr + 'T12:00:00'))
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateStandaloneEventClient() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState(1)
  const [dir, setDir] = useState(1)

  const [form, setForm] = useState<EventForm>({
    sport: 'football',
    date: todayStr(),
    startTime: '20:00',
    endTime: '21:30',
    locationName: '',
    locationAddress: '',
    maxParticipants: 14,
    visibility: 'link_only',
    notes: '',
  })

  const set = useCallback(<K extends keyof EventForm>(key: K, val: EventForm[K]) => {
    setForm((f) => ({ ...f, [key]: val }))
  }, [])

  function canAdvance(): boolean {
    if (step === 1) return !!form.sport && !!form.date && !!form.startTime && !!form.endTime
    if (step === 2) return form.locationName.trim().length >= 2
    return true
  }

  function goNext() {
    if (!canAdvance()) return
    setDir(1)
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function goBack() {
    setDir(-1)
    setStep((s) => Math.max(s - 1, 1))
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createStandaloneEvent({
        sport: form.sport,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        locationName: form.locationName,
        locationAddress: form.locationAddress,
        maxParticipants: form.maxParticipants,
        visibility: form.visibility,
        notes: form.notes,
      })

      if (result?.error) {
        toast.error(result.error)
      }
      // redirect() no server action faz a navegação automaticamente em caso de sucesso
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">

      {/* ── Fixed header ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60 px-4 pt-4 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={step === 1 ? () => router.back() : goBack}
            className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer -ml-1"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="flex items-center gap-2">
            <SportIcon sport={form.sport} size="sm" />
            <p className="text-sm font-semibold text-slate-100 leading-snug">Evento avulso</p>
          </div>

          <div className="size-9" />
        </div>

        <StepBar current={step} total={TOTAL_STEPS} labels={STEP_LABELS} />
      </div>

      {/* ── Step content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="px-4 pt-6 pb-4 space-y-6"
          >
            {step === 1 && <StepSportWhen form={form} set={set} />}
            {step === 2 && <StepWhere form={form} set={set} />}
            {step === 3 && <StepDetails form={form} set={set} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer CTA ───────────────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/60 px-4 py-4 safe-bottom">
        {step < TOTAL_STEPS ? (
          <Button
            fullWidth
            size="lg"
            onClick={goNext}
            disabled={!canAdvance()}
            rightIcon={<ChevronRight className="size-5" />}
          >
            Continuar
          </Button>
        ) : (
          <Button
            fullWidth
            size="lg"
            onClick={handleSubmit}
            loading={isPending}
            leftIcon={<Check className="size-5" strokeWidth={3} />}
          >
            Criar evento
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Step 1: Esporte + Quando ──────────────────────────────────────────────────

function StepSportWhen({
  form, set,
}: {
  form: EventForm
  set: <K extends keyof EventForm>(k: K, v: EventForm[K]) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Que jogo é esse?</h2>
        <p className="text-sm text-slate-400 mt-1">Escolha o esporte, data e horário.</p>
      </div>

      <div className="space-y-2">
        <Label icon={<Users className="size-4" />}>Esporte</Label>
        <div className="grid grid-cols-3 gap-2">
          {SPORTS.map(({ id, label, emoji }) => {
            const selected = form.sport === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => set('sport', id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-[0.97]',
                  selected
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-700',
                )}
              >
                <span className="text-xl leading-none">{emoji}</span>
                <span className={cn('text-[11px] font-medium', selected ? 'text-primary-300' : 'text-slate-400')}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <NativeField
        label="Data"
        icon={<Calendar className="size-4" />}
        type="date"
        value={form.date}
        min={todayStr()}
        onChange={(e) => set('date', e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <NativeField
          label="Início"
          icon={<Clock className="size-4" />}
          type="time"
          value={form.startTime}
          onChange={(e) => set('startTime', e.target.value)}
        />
        <NativeField
          label="Término"
          icon={<Clock className="size-4" />}
          type="time"
          value={form.endTime}
          min={form.startTime}
          onChange={(e) => set('endTime', e.target.value)}
        />
      </div>
    </div>
  )
}

// ── Step 2: Onde ──────────────────────────────────────────────────────────────

function StepWhere({
  form, set,
}: {
  form: EventForm
  set: <K extends keyof EventForm>(k: K, v: EventForm[K]) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Onde vai acontecer?</h2>
        <p className="text-sm text-slate-400 mt-1">Nome e endereço do local.</p>
      </div>

      <Input
        label="Nome do local"
        placeholder="Ex: Quadra do bairro"
        value={form.locationName}
        onChange={(e) => set('locationName', e.target.value)}
        leftIcon={<MapPin className="size-4" />}
        autoFocus
      />

      <Input
        label="Endereço"
        placeholder="Ex: Rua das Palmeiras, 100"
        value={form.locationAddress}
        onChange={(e) => set('locationAddress', e.target.value)}
        leftIcon={<MapPin className="size-4 opacity-0" />}
      />
    </div>
  )
}

// ── Step 3: Detalhes + Review ─────────────────────────────────────────────────

function StepDetails({
  form, set,
}: {
  form: EventForm
  set: <K extends keyof EventForm>(k: K, v: EventForm[K]) => void
}) {
  const sportLabel = SPORTS.find((s) => s.id === form.sport)?.label ?? form.sport

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Últimos detalhes</h2>
        <p className="text-sm text-slate-400 mt-1">Vagas, visibilidade e observações.</p>
      </div>

      <NumberStepper
        label="Total de vagas"
        value={form.maxParticipants}
        onChange={(v) => set('maxParticipants', v)}
        min={2}
        max={100}
        hint="Número máximo de participantes confirmados."
      />

      <div className="space-y-2">
        <Label icon={<Link2 className="size-4" />}>Quem pode ver e entrar</Label>

        <button
          type="button"
          onClick={() => set('visibility', 'link_only')}
          className={cn(
            'w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98]',
            form.visibility === 'link_only'
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-slate-700 bg-slate-900 hover:border-slate-600',
          )}
        >
          <Link2 className={cn('size-4 flex-shrink-0 mt-0.5', form.visibility === 'link_only' ? 'text-primary-400' : 'text-slate-500')} />
          <div className="flex-1">
            <p className={cn('text-sm font-semibold', form.visibility === 'link_only' ? 'text-primary-300' : 'text-slate-200')}>
              Só com link
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Só quem tiver o link consegue ver e entrar.</p>
          </div>
          {form.visibility === 'link_only' && (
            <div className="size-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="size-3 text-white" strokeWidth={3} />
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => set('visibility', 'public')}
          className={cn(
            'w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98]',
            form.visibility === 'public'
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-slate-700 bg-slate-900 hover:border-slate-600',
          )}
        >
          <Globe className={cn('size-4 flex-shrink-0 mt-0.5', form.visibility === 'public' ? 'text-primary-400' : 'text-slate-500')} />
          <div className="flex-1">
            <p className={cn('text-sm font-semibold', form.visibility === 'public' ? 'text-primary-300' : 'text-slate-200')}>
              Público
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Aparece numa página de descoberta pra outros usuários do app. Você aprova cada participação manualmente.
            </p>
          </div>
          {form.visibility === 'public' && (
            <div className="size-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="size-3 text-white" strokeWidth={3} />
            </div>
          )}
        </button>
      </div>

      <div className="space-y-1.5">
        <Label icon={<FileText className="size-4" />}>Observações</Label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Ex: Levar colete! Time A = verde, Time B = laranja."
          rows={3}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 text-sm resize-none outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
        />
        <p className="text-xs text-slate-500">{form.notes.length}/200 caracteres</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resumo do evento</p>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
          <ReviewRow icon="🏆" label="Esporte" value={sportLabel} />
          <ReviewRow icon="📆" label="Data" value={formatDatePretty(form.date)} />
          <ReviewRow icon="🕐" label="Horário" value={`${form.startTime} – ${form.endTime}`} />
          <ReviewRow icon="📍" label="Local" value={form.locationName || '—'} sub={form.locationAddress} />
          <ReviewRow icon="👥" label="Vagas" value={`${form.maxParticipants} total`} />
          <ReviewRow icon="🔗" label="Visibilidade" value={form.visibility === 'link_only' ? 'Só com link' : 'Público'} />
          {form.notes && (
            <ReviewRow icon="📝" label="Obs." value={form.notes} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Label({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
      {icon && <span className="text-slate-400">{icon}</span>}
      {children}
    </p>
  )
}

function NativeField({
  label, icon, type, value, onChange, min, hint,
}: {
  label: string
  icon?: React.ReactNode
  type: 'date' | 'time'
  value: string
  onChange: React.ChangeEventHandler<HTMLInputElement>
  min?: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label icon={icon}>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        min={min}
        className={cn(
          'w-full h-12 bg-slate-800 border border-slate-700 rounded-xl px-4',
          'text-slate-100 text-base outline-none transition-all',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          '[color-scheme:dark]',
        )}
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function ReviewRow({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-100 leading-snug">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
