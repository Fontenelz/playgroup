'use client'

import { use, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { ChevronLeft, Calendar, Clock, MapPin, Users, Star, RefreshCw, DollarSign, FileText, ChevronRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { SelectCardGroup } from '@/components/ui/SelectCard'
import { StepBar } from '@/components/ui/StepBar'
import { SportIcon } from '@/components/shared/SportIcon'
import { MOCK_GROUPS } from '@/data/mock'
import { SPORT_MAP } from '@/lib/constants'
import { formatCurrency, cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'monthly'
type WeekDay = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA'

interface EventForm {
  // Step 1 — Quando
  date: string
  startTime: string
  endTime: string
  recurrence: RecurrenceType
  weekDays: WeekDay[]
  seriesEnd: string
  // Step 2 — Onde
  locationName: string
  locationAddress: string
  // Step 3 — Vagas
  maxParticipants: number
  monthlySlots: number
  monthlyConfirmHours: number
  // Step 4 — Detalhes
  eventFee: string
  useGroupFee: boolean
  notes: string
}

const WEEKDAYS: { id: WeekDay; label: string; short: string }[] = [
  { id: 'SU', label: 'Domingo',  short: 'D' },
  { id: 'MO', label: 'Segunda',  short: 'S' },
  { id: 'TU', label: 'Terça',    short: 'T' },
  { id: 'WE', label: 'Quarta',   short: 'Q' },
  { id: 'TH', label: 'Quinta',   short: 'Q' },
  { id: 'FR', label: 'Sexta',    short: 'S' },
  { id: 'SA', label: 'Sábado',   short: 'S' },
]

const RECURRENCE_OPTIONS = [
  { id: 'none'     as RecurrenceType, label: 'Evento único',   description: 'Acontece apenas uma vez.',            icon: '📅' },
  { id: 'weekly'   as RecurrenceType, label: 'Semanal',        description: 'Repete toda semana no mesmo dia.',    icon: '🔁' },
  { id: 'biweekly' as RecurrenceType, label: 'Quinzenal',      description: 'Repete a cada duas semanas.',         icon: '📆' },
  { id: 'monthly'  as RecurrenceType, label: 'Mensal',         description: 'Repete uma vez por mês.',             icon: '🗓️' },
]

const CONFIRM_DEADLINE_OPTIONS = [
  { id: '24', label: '24h antes',  description: 'Prazo confortável.' },
  { id: '48', label: '48h antes',  description: 'Padrão recomendado.' },
  { id: '72', label: '72h antes',  description: 'Para grupos grandes.' },
  { id: '0',  label: 'Sem prazo',  description: 'Confirmação livre.' },
]

const STEP_LABELS = ['Quando', 'Onde', 'Vagas', 'Detalhes']
const TOTAL_STEPS = 4

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit:  (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function nextDateForWeekday(wd: WeekDay): string {
  const days = ['SU','MO','TU','WE','TH','FR','SA']
  const target = days.indexOf(wd)
  const now = new Date()
  const diff = (target - now.getDay() + 7) % 7 || 7
  const d = new Date(now)
  d.setDate(now.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function formatDatePretty(dateStr: string): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date(dateStr + 'T12:00:00'))
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreateEventPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = use(params)
  const router = useRouter()
  const group = MOCK_GROUPS.find((g) => g.id === groupId) ?? MOCK_GROUPS[0]
  const sport = SPORT_MAP[group.sport]

  const [step, setStep] = useState(1)
  const [dir, setDir]   = useState(1)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState<EventForm>({
    date:                todayStr(),
    startTime:           '20:00',
    endTime:             '21:30',
    recurrence:          'weekly',
    weekDays:            ['TH'],
    seriesEnd:           '',
    locationName:        group.sport === 'football' ? 'Campo São Luís FC' : '',
    locationAddress:     group.sport === 'football' ? 'Rua das Palmeiras, 100' : '',
    maxParticipants:     14,
    monthlySlots:        8,
    monthlyConfirmHours: 48,
    eventFee:            group.per_event_fee?.toString() ?? '',
    useGroupFee:         !!group.per_event_fee,
    notes:               '',
  })

  const set = useCallback(<K extends keyof EventForm>(key: K, val: EventForm[K]) => {
    setForm((f) => ({ ...f, [key]: val }))
  }, [])

  function toggleWeekDay(day: WeekDay) {
    setForm((f) => {
      const has = f.weekDays.includes(day)
      if (has && f.weekDays.length === 1) return f // keep at least 1
      return { ...f, weekDays: has ? f.weekDays.filter((d) => d !== day) : [...f.weekDays, day] }
    })
  }

  function canAdvance(): boolean {
    if (step === 1) return !!form.date && !!form.startTime && !!form.endTime
    if (step === 2) return form.locationName.trim().length >= 2
    if (step === 3) return form.maxParticipants >= 2 && form.monthlySlots <= form.maxParticipants
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

  async function handleSubmit() {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))

    toast.success('Evento criado com sucesso! 🎉')
    router.push(`/groups/${groupId}`)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const recurrenceLabel = RECURRENCE_OPTIONS.find((r) => r.id === form.recurrence)?.label ?? ''
  const weekDayLabels   = form.weekDays.map((d) => WEEKDAYS.find((w) => w.id === d)?.label).join(', ')
  const feeValue        = parseFloat(form.eventFee) || 0
  const openSlots       = form.maxParticipants - form.monthlySlots

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
            <SportIcon sport={group.sport} size="sm" />
            <div>
              <p className="text-xs text-slate-400 leading-none">Criar evento</p>
              <p className="text-sm font-semibold text-slate-100 leading-snug truncate max-w-[160px]">{group.name}</p>
            </div>
          </div>

          <div className="size-9" /> {/* spacer */}
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
            {step === 1 && (
              <StepWhen form={form} set={set} toggleWeekDay={toggleWeekDay} />
            )}
            {step === 2 && (
              <StepWhere form={form} set={set} />
            )}
            {step === 3 && (
              <StepSlots form={form} set={set} />
            )}
            {step === 4 && (
              <StepDetails
                form={form}
                set={set}
                group={group}
                recurrenceLabel={recurrenceLabel}
                weekDayLabels={weekDayLabels}
                openSlots={openSlots}
                feeValue={feeValue}
              />
            )}
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
            {step === TOTAL_STEPS - 1 ? 'Revisar evento' : 'Continuar'}
          </Button>
        ) : (
          <Button
            fullWidth
            size="lg"
            onClick={handleSubmit}
            loading={loading}
            leftIcon={<Check className="size-5" strokeWidth={3} />}
          >
            Criar evento
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Step 1: Quando ────────────────────────────────────────────────────────────

function StepWhen({
  form, set, toggleWeekDay,
}: {
  form: EventForm
  set: <K extends keyof EventForm>(k: K, v: EventForm[K]) => void
  toggleWeekDay: (d: WeekDay) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Quando vai acontecer?</h2>
        <p className="text-sm text-slate-400 mt-1">Defina data, horário e recorrência.</p>
      </div>

      {/* Recurrence */}
      <div className="space-y-2">
        <Label icon={<RefreshCw className="size-4" />}>Recorrência</Label>
        <SelectCardGroup
          options={RECURRENCE_OPTIONS}
          value={form.recurrence}
          onChange={(v) => {
            set('recurrence', v)
            if (v === 'weekly' || v === 'biweekly') {
              const today = new Date().getDay()
              const days: WeekDay[] = ['SU','MO','TU','WE','TH','FR','SA']
              set('weekDays', [days[today]])
              set('date', nextDateForWeekday(days[today]))
            }
          }}
          columns={2}
        />
      </div>

      {/* Weekday picker (only for recurring) */}
      {(form.recurrence === 'weekly' || form.recurrence === 'biweekly') && (
        <div className="space-y-2">
          <Label icon={<Calendar className="size-4" />}>Dia(s) da semana</Label>
          <div className="flex gap-2">
            {WEEKDAYS.map(({ id, short, label }) => {
              const selected = form.weekDays.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  title={label}
                  onClick={() => {
                    toggleWeekDay(id)
                    if (!form.weekDays.includes(id)) {
                      set('date', nextDateForWeekday(id))
                    }
                  }}
                  className={cn(
                    'flex-1 h-10 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95',
                    selected
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
                  )}
                >
                  {short}
                </button>
              )
            })}
          </div>
          {form.weekDays.length > 0 && (
            <p className="text-xs text-slate-500">
              Próximo: {formatDatePretty(nextDateForWeekday(form.weekDays[0]))}
            </p>
          )}
        </div>
      )}

      {/* Date (for one-time or monthly) */}
      {(form.recurrence === 'none' || form.recurrence === 'monthly') && (
        <NativeField
          label="Data"
          icon={<Calendar className="size-4" />}
          type="date"
          value={form.date}
          min={todayStr()}
          onChange={(e) => set('date', e.target.value)}
        />
      )}

      {/* Time */}
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

      {/* Series end date */}
      {form.recurrence !== 'none' && (
        <NativeField
          label="Encerrar série em (opcional)"
          icon={<Calendar className="size-4" />}
          type="date"
          value={form.seriesEnd}
          min={form.date}
          onChange={(e) => set('seriesEnd', e.target.value)}
          hint="Deixe em branco para série sem data de fim."
        />
      )}
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
  const SUGGESTIONS = [
    { name: 'Campo São Luís FC',    address: 'Rua das Palmeiras, 100'    },
    { name: 'Arena Calhau',         address: 'Av. Litorânea, s/n'        },
    { name: 'Quadra Coberta Norte', address: 'Av. dos Holandeses, 500'   },
    { name: 'Beach Park Maranhão',  address: 'Lagoa da Jansen, s/n'      },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Onde vai acontecer?</h2>
        <p className="text-sm text-slate-400 mt-1">Nome e endereço do local.</p>
      </div>

      <Input
        label="Nome do local"
        placeholder="Ex: Campo São Luís FC"
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

      {/* Sugestões */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Locais frequentes</p>
        <div className="space-y-2">
          {SUGGESTIONS.map(({ name, address }) => (
            <button
              key={name}
              type="button"
              onClick={() => { set('locationName', name); set('locationAddress', address) }}
              className={cn(
                'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer',
                form.locationName === name
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-700',
              )}
            >
              <MapPin className={cn('size-4 flex-shrink-0', form.locationName === name ? 'text-primary-400' : 'text-slate-500')} />
              <div>
                <p className={cn('text-sm font-medium', form.locationName === name ? 'text-primary-300' : 'text-slate-200')}>
                  {name}
                </p>
                <p className="text-xs text-slate-500">{address}</p>
              </div>
              {form.locationName === name && (
                <Check className="size-4 text-primary-400 ml-auto flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Vagas ─────────────────────────────────────────────────────────────

function StepSlots({
  form, set,
}: {
  form: EventForm
  set: <K extends keyof EventForm>(k: K, v: EventForm[K]) => void
}) {
  const openSlots = form.maxParticipants - form.monthlySlots

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Configurar vagas</h2>
        <p className="text-sm text-slate-400 mt-1">Defina capacidade e prazo dos mensalistas.</p>
      </div>

      {/* Total slots */}
      <NumberStepper
        label="Total de vagas"
        value={form.maxParticipants}
        onChange={(v) => {
          set('maxParticipants', v)
          if (form.monthlySlots > v) set('monthlySlots', v)
        }}
        min={2}
        max={100}
        hint="Número máximo de participantes confirmados."
      />

      {/* Monthly slots */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label icon={<Star className="size-4 text-amber-400" />}>Vagas mensalistas</Label>
          <span className="text-xs text-slate-500">
            {openSlots} vaga{openSlots !== 1 ? 's' : ''} avulsa{openSlots !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-3">
          <NumberStepper
            value={form.monthlySlots}
            onChange={(v) => set('monthlySlots', v)}
            min={0}
            max={form.maxParticipants}
          />

          {/* Visual breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              <div
                className="bg-amber-500 rounded-l-full transition-all duration-300"
                style={{ width: `${(form.monthlySlots / form.maxParticipants) * 100}%` }}
              />
              <div
                className="bg-primary-500 rounded-r-full transition-all duration-300"
                style={{ width: `${(openSlots / form.maxParticipants) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-amber-400 flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-500 inline-block" />
                {form.monthlySlots} mensalistas
              </span>
              <span className="text-primary-400 flex items-center gap-1">
                {openSlots} avulsos
                <span className="size-2 rounded-full bg-primary-500 inline-block" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm deadline (only for recurring) */}
      {form.recurrence !== 'none' && form.monthlySlots > 0 && (
        <div className="space-y-2">
          <Label icon={<Clock className="size-4" />}>Prazo de confirmação (mensalistas)</Label>
          <p className="text-xs text-slate-500 -mt-1">
            Após o prazo, vagas não confirmadas são liberadas para a fila.
          </p>
          <SelectCardGroup
            options={CONFIRM_DEADLINE_OPTIONS}
            value={String(form.monthlyConfirmHours)}
            onChange={(v) => set('monthlyConfirmHours', parseInt(v))}
            columns={2}
          />
        </div>
      )}
    </div>
  )
}

// ── Step 4: Detalhes + Review ─────────────────────────────────────────────────

function StepDetails({
  form, set, group, recurrenceLabel, weekDayLabels, openSlots, feeValue,
}: {
  form: EventForm
  set: <K extends keyof EventForm>(k: K, v: EventForm[K]) => void
  group: typeof MOCK_GROUPS[0]
  recurrenceLabel: string
  weekDayLabels: string
  openSlots: number
  feeValue: number
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Últimos detalhes</h2>
        <p className="text-sm text-slate-400 mt-1">Valor, observações e revisão final.</p>
      </div>

      {/* Fee */}
      <div className="space-y-3">
        <Label icon={<DollarSign className="size-4" />}>Valor do evento</Label>

        {group.per_event_fee && (
          <button
            type="button"
            onClick={() => {
              set('useGroupFee', !form.useGroupFee)
              if (!form.useGroupFee) set('eventFee', group.per_event_fee!.toString())
              else set('eventFee', '')
            }}
            className={cn(
              'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer',
              form.useGroupFee
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-slate-700 bg-slate-900 hover:border-slate-600',
            )}
          >
            <div className={cn(
              'size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
              form.useGroupFee ? 'border-primary-500 bg-primary-500' : 'border-slate-600',
            )}>
              {form.useGroupFee && <div className="size-2 rounded-full bg-white" />}
            </div>
            <div>
              <p className={cn('text-sm font-medium', form.useGroupFee ? 'text-primary-300' : 'text-slate-300')}>
                Usar valor padrão do grupo
              </p>
              <p className="text-xs text-slate-500">
                {formatCurrency(group.per_event_fee)} por pessoa
              </p>
            </div>
          </button>
        )}

        {!form.useGroupFee && (
          <Input
            label="Valor personalizado"
            placeholder="0,00"
            type="number"
            inputMode="decimal"
            value={form.eventFee}
            onChange={(e) => set('eventFee', e.target.value)}
            leftIcon={<span className="text-sm text-slate-400 font-medium">R$</span>}
            hint="Deixe em branco para evento sem cobrança."
          />
        )}
      </div>

      {/* Notes */}
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

      {/* ── Review summary ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resumo do evento</p>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
          <ReviewRow icon="📅" label="Recorrência" value={recurrenceLabel} />

          {(form.recurrence === 'weekly' || form.recurrence === 'biweekly') ? (
            <ReviewRow icon="📆" label="Dias" value={weekDayLabels} />
          ) : (
            <ReviewRow icon="📆" label="Data" value={formatDatePretty(form.date)} />
          )}

          <ReviewRow
            icon="🕐"
            label="Horário"
            value={`${form.startTime} – ${form.endTime}`}
          />
          <ReviewRow
            icon="📍"
            label="Local"
            value={form.locationName}
            sub={form.locationAddress}
          />
          <ReviewRow
            icon="👥"
            label="Vagas"
            value={`${form.maxParticipants} total`}
            sub={`${form.monthlySlots} mensalistas · ${openSlots} avulsos`}
          />
          {form.recurrence !== 'none' && form.monthlySlots > 0 && form.monthlyConfirmHours > 0 && (
            <ReviewRow icon="⏰" label="Prazo mensalistas" value={`${form.monthlyConfirmHours}h antes`} />
          )}
          {feeValue > 0 && (
            <ReviewRow icon="💰" label="Valor" value={formatCurrency(feeValue) + ' / pessoa'} />
          )}
          {form.notes && (
            <ReviewRow icon="📝" label="Obs." value={form.notes} />
          )}
          {form.seriesEnd && (
            <ReviewRow icon="🔚" label="Série até" value={formatDatePretty(form.seriesEnd)} />
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
          // native date/time picker color in dark
          '[color-scheme:dark]',
        )}
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function ReviewRow({
  icon, label, value, sub,
}: {
  icon: string
  label: string
  value: string
  sub?: string
}) {
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
