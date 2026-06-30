'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { ChevronLeft, ChevronRight, Check, Lock, Globe, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { SelectCardGroup } from '@/components/ui/SelectCard'
import { StepBar } from '@/components/ui/StepBar'
import { SportIcon } from '@/components/shared/SportIcon'
import { SPORTS } from '@/lib/constants'
import { formatCurrency, cn } from '@/lib/utils'
import type { SportId } from '@/lib/constants'

type AccessType = 'public' | 'invite' | 'private'
type SkillFocus = 'all' | 'beginner' | 'intermediate' | 'advanced'

interface GroupForm {
  sport:       SportId | null
  name:        string
  description: string
  city:        string
  access:      AccessType
  skillFocus:  SkillFocus
  maxMembers:  number
  monthlyFee:  string
  perEventFee: string
  useFee:      boolean
  paymentDay:  string
}

const STEP_LABELS = ['Esporte', 'Sobre', 'Vagas', 'Revisão']
const TOTAL_STEPS = 4

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit:  (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
}

const ACCESS_OPTIONS: { id: AccessType; label: string; description: string; icon: string }[] = [
  { id: 'public',  label: 'Público',     description: 'Qualquer pessoa pode pedir para entrar.',  icon: '🌎' },
  { id: 'invite',  label: 'Por convite', description: 'Apenas quem tiver o link pode entrar.',    icon: '🔗' },
  { id: 'private', label: 'Privado',     description: 'Somente o admin adiciona membros.',         icon: '🔒' },
]

const SKILL_OPTIONS: { id: SkillFocus; label: string; description: string }[] = [
  { id: 'all',          label: 'Todos os níveis', description: 'Iniciantes ao profissional.' },
  { id: 'beginner',     label: 'Iniciante',       description: 'Foco em aprender e se divertir.' },
  { id: 'intermediate', label: 'Intermediário',   description: 'Já tem experiência no esporte.' },
  { id: 'advanced',     label: 'Avançado',        description: 'Jogar no alto nível competitivo.' },
]

const PAYMENT_DAYS = ['1', '5', '10', '15', '20', '25']

export default function CreateGroupPage() {
  const router = useRouter()

  const [step, setStep]       = useState(1)
  const [dir, setDir]         = useState(1)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState<GroupForm>({
    sport:       null,
    name:        '',
    description: '',
    city:        'São Luís, MA',
    access:      'invite',
    skillFocus:  'all',
    maxMembers:  20,
    monthlyFee:  '60',
    perEventFee: '15',
    useFee:      true,
    paymentDay:  '5',
  })

  const set = useCallback(<K extends keyof GroupForm>(key: K, val: GroupForm[K]) => {
    setForm((f) => ({ ...f, [key]: val }))
  }, [])

  function canAdvance(): boolean {
    if (step === 1) return !!form.sport
    if (step === 2) return form.name.trim().length >= 3
    if (step === 3) return form.maxMembers >= 2
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
    toast.success('Grupo criado com sucesso! 🎉')
    router.push('/groups')
  }

  const monthlyFeeNum  = parseFloat(form.monthlyFee)  || 0
  const perEventFeeNum = parseFloat(form.perEventFee) || 0
  const selectedSport  = SPORTS.find((s) => s.id === form.sport) as typeof SPORTS[number] | undefined

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60 px-4 pt-4 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={step === 1 ? () => router.back() : goBack}
            className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer -ml-1"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="flex items-center gap-2">
            {form.sport && <SportIcon sport={form.sport} size="sm" />}
            <div>
              <p className="text-xs text-slate-400 leading-none">Criar grupo</p>
              <p className="text-sm font-semibold text-slate-100 leading-snug truncate max-w-[160px]">
                {form.name || selectedSport?.label || 'Novo grupo'}
              </p>
            </div>
          </div>

          <div className="size-9" />
        </div>

        <StepBar current={step} total={TOTAL_STEPS} labels={STEP_LABELS} />
      </div>

      {/* Step content */}
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
            {step === 1 && <StepSport form={form} set={set} />}
            {step === 2 && <StepAbout form={form} set={set} />}
            {step === 3 && <StepSlots form={form} set={set} monthlyFeeNum={monthlyFeeNum} perEventFeeNum={perEventFeeNum} />}
            {step === 4 && (
              <StepReview
                form={form}
                selectedSport={selectedSport}
                monthlyFeeNum={monthlyFeeNum}
                perEventFeeNum={perEventFeeNum}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/60 px-4 py-4 safe-bottom">
        {step < TOTAL_STEPS ? (
          <Button
            fullWidth
            size="lg"
            onClick={goNext}
            disabled={!canAdvance()}
            rightIcon={<ChevronRight className="size-5" />}
          >
            {step === TOTAL_STEPS - 1 ? 'Revisar grupo' : 'Continuar'}
          </Button>
        ) : (
          <Button
            fullWidth
            size="lg"
            onClick={handleSubmit}
            loading={loading}
            leftIcon={<Check className="size-5" strokeWidth={3} />}
          >
            Criar grupo
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Step 1: Esporte ───────────────────────────────────────────────────────────

function StepSport({
  form, set,
}: {
  form: GroupForm
  set: <K extends keyof GroupForm>(k: K, v: GroupForm[K]) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Qual é o esporte?</h2>
        <p className="text-sm text-slate-400 mt-1">Escolha o esporte principal do grupo.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {SPORTS.map(({ id, label, emoji }) => {
          const selected = form.sport === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => set('sport', id as SportId)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer active:scale-95',
                selected
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-700',
              )}
            >
              <span className="text-3xl leading-none">{emoji}</span>
              <span className={cn('text-xs font-medium text-center leading-tight', selected ? 'text-primary-300' : 'text-slate-400')}>
                {label}
              </span>
              {selected && (
                <div className="size-5 rounded-full bg-primary-500 flex items-center justify-center">
                  <Check className="size-3 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Step 2: Sobre ─────────────────────────────────────────────────────────────

function StepAbout({
  form, set,
}: {
  form: GroupForm
  set: <K extends keyof GroupForm>(k: K, v: GroupForm[K]) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Sobre o grupo</h2>
        <p className="text-sm text-slate-400 mt-1">Informações básicas e acesso.</p>
      </div>

      <Input
        label="Nome do grupo"
        placeholder="Ex: Futebol Quinta São Luís"
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        hint={`${form.name.length}/50 caracteres`}
        autoFocus
      />

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-slate-300">Descrição (opcional)</p>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Ex: Jogo toda quinta, venha jogar!"
          rows={2}
          maxLength={200}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 text-sm resize-none outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
        />
      </div>

      <Input
        label="Cidade"
        placeholder="Ex: São Luís, MA"
        value={form.city}
        onChange={(e) => set('city', e.target.value)}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-300">Acesso ao grupo</p>
        <SelectCardGroup
          options={ACCESS_OPTIONS}
          value={form.access}
          onChange={(v) => set('access', v as AccessType)}
          columns={1}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-300">Nível dos jogadores</p>
        <SelectCardGroup
          options={SKILL_OPTIONS}
          value={form.skillFocus}
          onChange={(v) => set('skillFocus', v as SkillFocus)}
          columns={2}
        />
      </div>
    </div>
  )
}

// ── Step 3: Vagas e Financeiro ────────────────────────────────────────────────

function StepSlots({
  form, set, monthlyFeeNum, perEventFeeNum,
}: {
  form: GroupForm
  set: <K extends keyof GroupForm>(k: K, v: GroupForm[K]) => void
  monthlyFeeNum: number
  perEventFeeNum: number
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Vagas e mensalidade</h2>
        <p className="text-sm text-slate-400 mt-1">Defina capacidade e modelo financeiro.</p>
      </div>

      <NumberStepper
        label="Máximo de membros"
        value={form.maxMembers}
        onChange={(v) => set('maxMembers', v)}
        min={2}
        max={200}
        step={2}
        hint="Número máximo de membros ativos no grupo."
      />

      {/* Fee toggle */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-300">Modelo financeiro</p>
        <button
          type="button"
          onClick={() => set('useFee', !form.useFee)}
          className={cn(
            'w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer',
            form.useFee ? 'border-primary-500 bg-primary-500/10' : 'border-slate-700 bg-slate-900',
          )}
        >
          <div className={cn(
            'size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
            form.useFee ? 'border-primary-500 bg-primary-500' : 'border-slate-600',
          )}>
            {form.useFee && <div className="size-2 rounded-full bg-white" />}
          </div>
          <div>
            <p className={cn('text-sm font-medium', form.useFee ? 'text-primary-300' : 'text-slate-300')}>
              Grupo tem mensalidade / evento pago
            </p>
            <p className="text-xs text-slate-500">Habilita controle financeiro e cobranças.</p>
          </div>
        </button>
      </div>

      {form.useFee && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Input
            label="Mensalidade (R$)"
            placeholder="0,00"
            type="number"
            inputMode="decimal"
            value={form.monthlyFee}
            onChange={(e) => set('monthlyFee', e.target.value)}
            leftIcon={<span className="text-sm text-slate-400 font-medium">R$</span>}
            hint="Valor mensal para mensalistas."
          />

          <Input
            label="Valor por evento / avulso (R$)"
            placeholder="0,00"
            type="number"
            inputMode="decimal"
            value={form.perEventFee}
            onChange={(e) => set('perEventFee', e.target.value)}
            leftIcon={<span className="text-sm text-slate-400 font-medium">R$</span>}
            hint="Cobrado de avulsos por participação."
          />

          {/* Payment day */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">Dia de vencimento</p>
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set('paymentDay', d)}
                  className={cn(
                    'size-11 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-95',
                    form.paymentDay === d
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700',
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Todo mês no dia {form.paymentDay}.</p>
          </div>

          {/* Fee preview */}
          {(monthlyFeeNum > 0 || perEventFeeNum > 0) && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Resumo financeiro</p>
              {monthlyFeeNum > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Mensalidade</span>
                  <span className="text-sm font-semibold text-slate-100">{formatCurrency(monthlyFeeNum)}/mês</span>
                </div>
              )}
              {perEventFeeNum > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Avulso/evento</span>
                  <span className="text-sm font-semibold text-slate-100">{formatCurrency(perEventFeeNum)}/evento</span>
                </div>
              )}
              {monthlyFeeNum > 0 && form.maxMembers > 0 && (
                <div className="flex justify-between border-t border-slate-800 pt-2 mt-1">
                  <span className="text-sm text-slate-400">Potencial/mês (100% pago)</span>
                  <span className="text-sm font-bold text-primary-400">{formatCurrency(monthlyFeeNum * form.maxMembers)}</span>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ── Step 4: Revisão ───────────────────────────────────────────────────────────

function StepReview({
  form, selectedSport, monthlyFeeNum, perEventFeeNum,
}: {
  form: GroupForm
  selectedSport: typeof SPORTS[number] | undefined
  monthlyFeeNum: number
  perEventFeeNum: number
}) {
  const accessLabel = { public: 'Público 🌎', invite: 'Por convite 🔗', private: 'Privado 🔒' }[form.access]
  const skillLabel  = { all: 'Todos os níveis', beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado' }[form.skillFocus]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Revisão final</h2>
        <p className="text-sm text-slate-400 mt-1">Confirme as informações antes de criar.</p>
      </div>

      {/* Identity card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
        {form.sport && <SportIcon sport={form.sport} size="lg" />}
        <div>
          <p className="text-lg font-bold text-slate-100">{form.name}</p>
          <p className="text-sm text-slate-400">{form.city}</p>
          {form.description && (
            <p className="text-xs text-slate-500 mt-1 leading-snug">{form.description}</p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
        <ReviewRow icon="🏅" label="Esporte"  value={`${selectedSport?.emoji} ${selectedSport?.label}`} />
        <ReviewRow icon="🔐" label="Acesso"   value={accessLabel} />
        <ReviewRow icon="⚡" label="Nível"    value={skillLabel} />
        <ReviewRow icon="👥" label="Máx. membros" value={`${form.maxMembers} pessoas`} />
        {form.useFee && monthlyFeeNum > 0 && (
          <ReviewRow icon="💳" label="Mensalidade" value={`${formatCurrency(monthlyFeeNum)}/mês · vence dia ${form.paymentDay}`} />
        )}
        {form.useFee && perEventFeeNum > 0 && (
          <ReviewRow icon="🎟️" label="Avulso" value={`${formatCurrency(perEventFeeNum)}/evento`} />
        )}
        {!form.useFee && (
          <ReviewRow icon="💸" label="Financeiro" value="Sem cobranças" />
        )}
      </div>

      <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
        <p className="text-sm text-primary-300">
          Você será o <span className="font-bold">administrador</span> do grupo. Poderá convidar membros e gerenciar eventos após a criação.
        </p>
      </div>
    </div>
  )
}

function ReviewRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-100 leading-snug">{value}</p>
      </div>
    </div>
  )
}
