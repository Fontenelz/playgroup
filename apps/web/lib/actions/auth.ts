'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signInWithGoogle(next?: string) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')
  const callbackUrl = next
    ? `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`
    : `${origin}/api/auth/callback`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signInWithApple(next?: string) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')
  const callbackUrl = next
    ? `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`
    : `${origin}/api/auth/callback`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: callbackUrl,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signInWithEmail(email: string, password: string, next?: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  // Verifica se usuário tem perfil; se não, manda para onboarding
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      redirect('/onboarding')
    }
  }

  redirect(next ?? '/')
}

export async function signUpWithEmail(email: string, password: string, next?: string) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(next ?? '/')}`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Confirme seu email para continuar.' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
