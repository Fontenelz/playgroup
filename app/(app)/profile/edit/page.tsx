'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { ChevronLeft, Camera, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { SelectCardGroup } from '@/components/ui/SelectCard'
import { useAuthStore } from '@/store/auth.store'
import { SPORTS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { SportId } from '@/lib/constants'
import type { SkillLevel } from '@/types/app.types'

const SKILL_OPTIONS: { id: SkillLevel; label: string; description: string }[] = [
  { id: 'beginner',     label: 'Iniciante',     description: 'Estou aprendendo.' },
  { id: 'intermediate', label: 'Intermediário',  description: 'Tenho experiência.' },
  { id: 'advanced',     label: 'Avançado',       description: 'Jogo muito bem.'   },
  { id: 'professional', label: 'Profissional',   description: 'Nível competitivo.' },
]

export default function EditProfilePage() {
  const router       = useRouter()
  const storeUser    = useAuthStore((s) => s.user)
  const isLoading    = useAuthStore((s) => s.isLoading)
  const updateUser   = useAuthStore((s) => s.updateUser)

  // Form state - initialized from store when available
  const [name,          setName]          = useState('')
  const [nickname,      setNickname]      = useState('')
  const [bio,           setBio]           = useState('')
  const [city,          setCity]          = useState('')
  const [sports,        setSports]        = useState<SportId[]>([])
  const [skillLevel,    setSkillLevel]    = useState<SkillLevel>('intermediate')
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined)
  const [initialized,   setInitialized]   = useState(false)
  const [loading,       setLoading]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Redirect if not authenticated after loading
  useEffect(() => {
    if (!isLoading && !storeUser) {
      router.push('/login')
    }
  }, [isLoading, storeUser, router])

  // Initialize form when user data is available
  useEffect(() => {
    if (storeUser && !initialized) {
      setName(storeUser.name)
      setNickname(storeUser.nickname ?? '')
      setBio(storeUser.bio ?? '')
      setCity(storeUser.city ?? '')
      setSports((storeUser.sports ?? []) as SportId[])
      setSkillLevel(storeUser.skill_level ?? 'intermediate')
      setAvatarPreview(storeUser.avatar_url ?? undefined)
      setInitialized(true)
    }
  }, [storeUser, initialized])

  if (isLoading || !storeUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  function toggleSport(id: SportId) {
    setSports((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((s) => s !== id) : prev) : [...prev, id]
    )
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
    toast.success('Foto selecionada!')
  }

  const isDirty =
    name !== storeUser.name ||
    nickname !== (storeUser.nickname ?? '') ||
    bio !== (storeUser.bio ?? '') ||
    city !== (storeUser.city ?? '') ||
    JSON.stringify(sports) !== JSON.stringify(storeUser.sports) ||
    skillLevel !== storeUser.skill_level ||
    avatarPreview !== (storeUser.avatar_url ?? undefined)

  async function handleSave() {
    if (!name.trim()) { toast.error('Nome é obrigatório'); return }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))

    updateUser({
      name:        name.trim(),
      nickname:    nickname.trim() || name.split(' ')[0],
      bio:         bio.trim() || undefined,
      city:        city.trim() || undefined,
      sports,
      skill_level: skillLevel,
      avatar_url:  avatarPreview,
    })

    setLoading(false)
    toast.success('Perfil atualizado! ✅')
    router.back()
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
          <p className="flex-1 text-base font-bold text-slate-100">Editar perfil</p>
          {isDirty && (
            <button
              onClick={handleSave}
              className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
            >
              Salvar
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 pb-32 space-y-8">

        {/* ── Avatar ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="relative">
            <Avatar name={name || storeUser.name} src={avatarPreview} size="xl" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 size-9 rounded-full bg-primary-500 hover:bg-primary-400 border-2 border-slate-950 flex items-center justify-center cursor-pointer transition-colors shadow-lg"
            >
              <Camera className="size-4 text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
          >
            Alterar foto
          </button>
        </motion.div>

        {/* ── Basic info ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="space-y-4"
        >
          <SectionTitle>Informações básicas</SectionTitle>

          <Input
            label="Nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
          />

          <Input
            label="Apelido"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Como te chamam?"
            hint="Exibido em listas e ranking."
          />

          <Input
            label="Cidade"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: São Luís, MA"
          />

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-slate-300">Bio</p>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre você..."
              rows={2}
              maxLength={160}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 text-sm resize-none outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
            <p className="text-xs text-slate-600 text-right">{bio.length}/160</p>
          </div>
        </motion.div>

        {/* ── Esportes ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.10 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <SectionTitle>Esportes</SectionTitle>
            <p className="text-xs text-slate-500">{sports.length} selecionado{sports.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {SPORTS.map(({ id, label, emoji }) => {
              const selected = sports.includes(id as SportId)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleSport(id as SportId)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all cursor-pointer active:scale-95',
                    selected
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-700',
                  )}
                >
                  <span className="text-2xl leading-none">{emoji}</span>
                  <span className={cn('text-[11px] font-medium text-center leading-tight', selected ? 'text-primary-300' : 'text-slate-500')}>
                    {label}
                  </span>
                  {selected && (
                    <span className="size-4 rounded-full bg-primary-500 flex items-center justify-center">
                      <Check className="size-2.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* ── Nível ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="space-y-3"
        >
          <SectionTitle>Nível de jogo</SectionTitle>
          <SelectCardGroup
            options={SKILL_OPTIONS}
            value={skillLevel}
            onChange={(v) => setSkillLevel(v as SkillLevel)}
            columns={2}
          />
        </motion.div>
      </div>

      {/* Footer CTA */}
      <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/60 px-4 py-4 safe-bottom">
        <Button
          fullWidth
          size="lg"
          onClick={handleSave}
          loading={loading}
          disabled={!isDirty}
          leftIcon={<Check className="size-5" strokeWidth={3} />}
        >
          Salvar alterações
        </Button>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{children}</p>
  )
}
