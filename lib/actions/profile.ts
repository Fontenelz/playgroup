'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface ProfileInput {
  name: string
  nickname: string
  city: string
  sports: string[]
}

export async function saveProfile(data: ProfileInput) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // avatar vindo do Google / Apple OAuth (user_metadata.avatar_url ou .picture)
  const avatar_url: string | null =
    user.user_metadata?.avatar_url ??
    user.user_metadata?.picture ??
    null

  const { error } = await supabase.from('users').upsert({
    id: user.id,
    name: data.name,
    nickname: data.nickname,
    city: data.city,
    sports: data.sports,
    skill_level: 'intermediate',
    ...(avatar_url ? { avatar_url } : {}),
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function updateProfile(data: Partial<ProfileInput>) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Não autenticado' }
  }

  const { error } = await supabase
    .from('users')
    .update(data)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
