'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { api, ApiError } from '@/lib/api/client'

export interface CreateGroupInput {
  sport: string
  name: string
  description: string
  accessType: 'public' | 'invite' | 'private'
  maxMembers: number
  monthlyFee: string
  perEventFee: string
  paymentDay: string
}

export async function createGroup(input: CreateGroupInput) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Não autenticado' }

  let group: { id: string }
  try {
    group = await api.post<{ id: string }>('/groups', {
      sport: input.sport,
      name: input.name,
      description: input.description || undefined,
      accessType: input.accessType,
      maxMembers: input.maxMembers,
      monthlyFee: parseFloat(input.monthlyFee) || undefined,
      perEventFee: parseFloat(input.perEventFee) || undefined,
      paymentDay: parseInt(input.paymentDay) || undefined,
    })
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }

  redirect(`/groups/${group.id}`)
}

export async function createInviteCode(groupId: string): Promise<{ code?: string; error?: string }> {
  try {
    return await api.post(`/groups/${groupId}/invite-codes`)
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export async function joinGroup(code: string): Promise<{ error?: string }> {
  let result: { groupId: string }
  try {
    result = await api.post<{ groupId: string }>(`/invites/${encodeURIComponent(code)}/redeem`)
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }

  redirect(`/groups/${result.groupId}`)
}
