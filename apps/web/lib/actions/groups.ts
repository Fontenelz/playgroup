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
  paymentDeadlineHours: number
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
      paymentDeadlineHours: input.paymentDeadlineHours || undefined,
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

export async function removeMember(groupId: string, userId: string): Promise<{ error?: string }> {
  try {
    await api.delete(`/groups/${groupId}/members/${userId}`)
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: 'organizer' | 'participant',
): Promise<{ error?: string }> {
  try {
    await api.patch(`/groups/${groupId}/members/${userId}/role`, { role })
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export type GroupMembershipStatus = 'none' | 'pending' | 'active'

export interface PublicGroupCard {
  id: string
  name: string
  description: string | null
  sport: string
  max_members: number
  member_count: number
  my_status: GroupMembershipStatus
}

export async function getPublicGroupsFeed(sport?: string): Promise<{ groups: PublicGroupCard[]; error?: string }> {
  try {
    const result = await api.get<{
      groups: PublicGroupCard[]
      total: number
      page: number
      take: number
    }>(`/groups/discover${sport ? `?sport=${encodeURIComponent(sport)}` : ''}`)

    return { groups: result.groups }
  } catch (err) {
    if (err instanceof ApiError) return { groups: [], error: err.message }
    throw err
  }
}

export async function requestToJoinGroup(groupId: string): Promise<{ status?: GroupMembershipStatus; error?: string }> {
  try {
    const result = await api.post<{ status: GroupMembershipStatus }>(`/groups/${groupId}/join-request`)
    return { status: result.status }
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export async function approveJoinRequest(groupId: string, userId: string): Promise<{ error?: string }> {
  try {
    await api.post(`/groups/${groupId}/members/${userId}/approve`)
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export async function rejectJoinRequest(groupId: string, userId: string): Promise<{ error?: string }> {
  try {
    await api.post(`/groups/${groupId}/members/${userId}/reject`)
    return {}
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
