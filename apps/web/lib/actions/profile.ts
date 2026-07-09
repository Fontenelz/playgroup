'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { api, ApiError } from '@/lib/api/client'

export interface ProfileInput {
  name: string
  nickname: string
  city: string
  sports: string[]
  bio?: string
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'professional'
  avatarUrl?: string
}

export async function saveProfile(data: ProfileInput, next?: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  try {
    await api.put('/users/me', data)
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }

  redirect(next ?? '/')
}

export async function getProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  try {
    return await api.get('/users/me')
  } catch {
    return null
  }
}

export async function updateProfile(data: Partial<ProfileInput>) {
  try {
    await api.patch('/users/me', data)
    return { success: true }
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}
