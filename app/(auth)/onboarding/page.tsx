'use client'

import { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { ChevronLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { SPORTS } from '@/lib/constants'
import { saveProfile } from '@/lib/actions/profile'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { SportId } from '@/lib/constants'

const TOTAL_STEPS = 4

const variants = {
  enter:  { opacity: 0, x:  40 },
  center: { opacity: 1, x:   0 },
  exit:   { opacity: 0, x: -40 },
}

export default function OnboardingPage() {
  const [isPending, startTransition] = useTransition()

  const [step, setStep]           = useState(1)
  const [name, setName]           = useState('')
  const [nickname, setNickname]   = useState('')
  const [city, setCity]           = useState('')
  const [sports, setSports]       = useState<SportId[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined)

  // Pré-preenche nome/apelido e avatar vindos do Google OAuth
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const meta = user.user_metadata
      const fullName: string = meta?.full_name ?? meta?.name ?? ''
      const firstName = fullName.split(' ')[0] ?? ''
      if (fullName && !name) setName(fullName)
      if (firstName && !nickname) setNickname(firstName)
      if (meta?.avatar_url) setAvatarUrl(meta.avatar_url)
      else if (meta?.picture) setAvatarUrl(meta.picture)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleSport(id: SportId) {
    setSports((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  function canAdvance() {
    if (step === 1) return name.trim().length >= 2 && nickname.trim().length >= 2
    if (step === 2) return city.trim().length >= 2
    if (step === 3) return sports.length > 0
    return true
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep(step + 1)
      return
    }
    submit('/')
  }

  function submit(next: string) {
    startTransition(async () => {
      const result = await saveProfile({ name, nickname, city, sports })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Bem-vindo ao PlayGroup!')
      // redirect() no server action leva para next automaticamente
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 max-w-lg mx-auto">
      {/* Barra de progresso */}
      <div className="h-1 bg-slate-800">
        <motion.div
          className="h-full bg-primary-500 rounded-full"
          animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Topo */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 transition-colors text-slate-400 cursor-pointer"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : (
          <div className="size-9" />
        )}
        <span className="text-xs text-slate-500 font-medium">{step} de {TOTAL_STEPS}</span>
        <div className="size-9" />
      </div>

      {/* Conteúdo do step */}
      <div className="flex-1 px-5 pt-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <div className="space-y-6">
                {avatarUrl && (
                  <div className="flex flex-col items-center gap-2">
                    <Avatar name={name} src={avatarUrl} size="xl" />
                    <p className="text-xs text-slate-500">Foto importada do Google</p>
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-slate-100 mb-1">Como podemos te chamar?</h2>
                  <p className="text-sm text-slate-400">Seu nome é exibido para outros membros do grupo.</p>
                </div>
                <Input
                  label="Nome completo"
                  placeholder="Ex: Matheus Wirino"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (!nickname || nickname === name.split(' ')[0]) {
                      setNickname(e.target.value.split(' ')[0])
                    }
                  }}
                  autoFocus
                />
                <Input
                  label="Apelido no grupo"
                  placeholder="Ex: Matheus"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  hint="Este é o nome que aparecerá nas listas de presença."
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100 mb-1">Onde você joga?</h2>
                  <p className="text-sm text-slate-400">Conecte-se com outros jogadores da sua cidade.</p>
                </div>
                <Input
                  label="Sua cidade"
                  placeholder="Ex: São Luís, MA"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoFocus
                />
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Cidades populares</p>
                  <div className="flex flex-wrap gap-2">
                    {['São Luís, MA','Fortaleza, CE','Belém, PA','Manaus, AM','Teresina, PI'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setCity(c)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm border transition-all cursor-pointer',
                          city === c
                            ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600',
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100 mb-1">Quais atividades você pratica?</h2>
                  <p className="text-sm text-slate-400">Selecione pelo menos uma. Pode mudar depois.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SPORTS.map(({ id, label, emoji }) => {
                    const selected = sports.includes(id)
                    return (
                      <button
                        key={id}
                        onClick={() => toggleSport(id)}
                        className={cn(
                          'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer',
                          selected
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-slate-800 bg-slate-900 hover:border-slate-700',
                        )}
                      >
                        <span className="text-2xl leading-none">{emoji}</span>
                        <span className={cn('text-sm font-medium', selected ? 'text-primary-300' : 'text-slate-300')}>
                          {label}
                        </span>
                        {selected && (
                          <div className="ml-auto size-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                            <Check className="size-3 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8 text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="size-24 rounded-3xl bg-primary-500/10 border-2 border-primary-500/30 flex items-center justify-center">
                    <span className="text-5xl">🏆</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-100">Tudo pronto, {nickname}!</h2>
                    <p className="text-sm text-slate-400 mt-2">
                      Você pratica{' '}
                      {sports.map((s) => SPORTS.find((x) => x.id === s)?.label).join(', ')}{' '}
                      em {city}.
                    </p>
                  </div>
                </motion.div>

                <div className="space-y-3 text-left">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider text-center">
                    O que você quer fazer primeiro?
                  </p>
                  {[
                    { emoji: '🏆', text: 'Criar meu primeiro grupo', href: '/create/group' },
                    { emoji: '🔗', text: 'Entrar com link de convite', href: '/create' },
                    { emoji: '👀', text: 'Explorar o app',            href: '/home'   },
                  ].map(({ emoji, text }) => (
                    <button
                      key={text}
                      onClick={() => submit('/home')}
                      disabled={isPending}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800 transition-all text-left cursor-pointer active:scale-[0.98] disabled:opacity-50"
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span className="text-sm font-medium text-slate-200">{text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Botão de avançar (steps 1–3) */}
      {step < 4 && (
        <div className="px-5 pb-10 pt-6">
          <Button
            fullWidth
            size="lg"
            onClick={handleNext}
            loading={isPending}
            disabled={!canAdvance() || isPending}
          >
            {step === TOTAL_STEPS - 1 ? 'Finalizar' : 'Continuar'}
          </Button>
        </div>
      )}
    </div>
  )
}
