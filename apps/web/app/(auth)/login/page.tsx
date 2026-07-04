'use client'

import { Suspense, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Mail, Eye, EyeOff, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } from '@/lib/actions/auth'

type EmailMode = 'signin' | 'signup'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? undefined
  const [isPending, startTransition] = useTransition()
  const [showEmail, setShowEmail] = useState(false)
  const [emailMode, setEmailMode] = useState<EmailMode>('signin')
  const [showPass, setShowPass] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  function handleOAuth(provider: 'google' | 'apple') {
    setLoadingAction(provider)
    startTransition(async () => {
      const action = provider === 'google' ? signInWithGoogle : signInWithApple
      const result = await action(next)
      if (result?.error) {
        toast.error(result.error)
        setLoadingAction(null)
      }
      // Sem erro → server action executou redirect(), navegação acontece automaticamente
    })
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return

    setLoadingAction('email')
    startTransition(async () => {
      if (emailMode === 'signup') {
        const result = await signUpWithEmail(email, password, next)
        if (result?.error) {
          toast.error(result.error)
        } else {
          toast.success(result?.success ?? 'Verifique seu email!')
          setShowEmail(false)
        }
        setLoadingAction(null)
        return
      }

      const result = await signInWithEmail(email, password, next)
      if (result?.error) {
        toast.error(
          result.error === 'Invalid login credentials'
            ? 'Email ou senha incorretos.'
            : result.error,
        )
        setLoadingAction(null)
      }
      // Sem erro → redirect() foi chamado pelo server action
    })
  }

  const isLoading = isPending || loadingAction !== null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-12"
      >
        <div className="size-20 rounded-3xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
          <span className="text-4xl">🏆</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-100">PlayGroup</h1>
        <p className="text-sm text-slate-400 mt-1 text-center max-w-xs">
          Organize qualquer esporte sem listas no WhatsApp
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm space-y-3"
      >
        {/* Google */}
        <Button
          fullWidth
          variant="outline"
          size="lg"
          loading={loadingAction === 'google'}
          disabled={isLoading}
          onClick={() => handleOAuth('google')}
          leftIcon={
            <svg className="size-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          }
        >
          Continuar com Google
        </Button>

        {/* Apple */}
        <Button
          fullWidth
          variant="outline"
          size="lg"
          loading={loadingAction === 'apple'}
          disabled={isLoading}
          onClick={() => handleOAuth('apple')}
          leftIcon={
            <svg className="size-5 fill-slate-100" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
          }
        >
          Continuar com Apple
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-xs text-slate-500">ou</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Email */}
        {!showEmail ? (
          <Button
            fullWidth
            variant="ghost"
            size="lg"
            onClick={() => setShowEmail(true)}
            leftIcon={<Mail className="size-5" />}
          >
            Continuar com Email
          </Button>
        ) : (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            onSubmit={handleEmailSubmit}
            className="space-y-3"
          >
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <Input
              label="Senha"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              rightIcon={
                <button type="button" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
            />
            <Button
              fullWidth
              size="lg"
              type="submit"
              loading={loadingAction === 'email'}
              disabled={isLoading || !email || !password}
            >
              {emailMode === 'signup' ? 'Criar conta' : 'Entrar'}
            </Button>

            <button
              type="button"
              onClick={() => setEmailMode((m) => m === 'signin' ? 'signup' : 'signin')}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-primary-400 transition-colors py-1"
            >
              <UserPlus className="size-3.5" />
              {emailMode === 'signin' ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
            </button>
          </motion.form>
        )}
      </motion.div>

      <p className="mt-8 text-xs text-slate-500 text-center">
        Ao continuar, você concorda com os{' '}
        <span className="text-primary-400 underline cursor-pointer">Termos de Uso</span>
        {' '}e a{' '}
        <span className="text-primary-400 underline cursor-pointer">Política de Privacidade</span>
      </p>
    </div>
  )
}
