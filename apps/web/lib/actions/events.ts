'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { api, ApiError } from '@/lib/api/client'

export interface CreateEventInput {
  date: string
  startTime: string
  endTime: string
  recurrence: 'none' | 'weekly' | 'biweekly' | 'monthly'
  weekDays: string[]
  seriesEnd: string
  locationName: string
  locationAddress: string
  maxParticipants: number
  monthlySlots: number
  monthlyConfirmHours: number
  eventFee: string
  notes: string
}

export async function createEvent(groupId: string, input: CreateEventInput) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Não autenticado' }

  try {
    await api.post(`/groups/${groupId}/events`, {
      ...input,
      locationName: input.locationName || undefined,
      locationAddress: input.locationAddress || undefined,
      eventFee: input.eventFee || undefined,
      notes: input.notes || undefined,
    })
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }

  redirect(`/groups/${groupId}`)
}

export interface CreateStandaloneEventInput {
  sport: string
  date: string
  startTime: string
  endTime: string
  locationName: string
  locationAddress: string
  maxParticipants: number
  visibility: 'link_only' | 'public'
  notes: string
}

export async function createStandaloneEvent(input: CreateStandaloneEventInput) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Não autenticado' }

  let eventId: string
  try {
    const result = await api.post<{ id: string }>('/events', {
      ...input,
      locationName: input.locationName || undefined,
      locationAddress: input.locationAddress || undefined,
      notes: input.notes || undefined,
    })
    eventId = result.id
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }

  redirect(`/e/${eventId}`)
}

export async function confirmParticipation(eventId: string): Promise<{ error?: string }> {
  try {
    await api.post(`/events/${eventId}/participation/confirm`)
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export interface GuestEventPreview {
  id: string
  groupId?: string
  title: string
  sport: string
  starts_at: string
  ends_at: string
  location_name: string | null
  max_participants: number
  participant_count: number
  groupName?: string
  visibility?: 'link_only' | 'public'
  isOwner: boolean
  myStatus: 'confirmed' | 'pending' | 'declined' | null
  isMember: boolean
  hasProfile: boolean
  profileNickname: string | null
}

export async function getGuestEventPreview(
  eventId: string,
): Promise<{ event?: GuestEventPreview; error?: string; authRequired?: boolean }> {
  const row = await api
    .get<{
      status_code: 'ok' | 'not_found' | 'private' | 'closed' | 'auth_required'
      event_id: string | null
      group_id: string | null
      title: string | null
      sport: string | null
      starts_at: string | null
      ends_at: string | null
      location_name: string | null
      max_participants: number | null
      participant_count: number
      group_name: string | null
      visibility: 'link_only' | 'public' | null
      is_owner: boolean
      my_status: 'confirmed' | 'pending' | 'declined' | null
      is_member: boolean
      has_profile: boolean
      profile_nickname: string | null
    }>(`/guest-events/${eventId}`)
    .catch(() => null)

  if (!row) {
    return { error: 'Não foi possível carregar este evento agora. Tente novamente.' }
  }
  if (row.status_code === 'not_found') {
    return { error: 'Evento não encontrado.' }
  }
  if (row.status_code === 'private') {
    return { error: 'Este evento é privado. Peça um convite para o grupo.' }
  }
  if (row.status_code === 'closed') {
    return { error: 'Este evento não está mais aceitando confirmações.' }
  }
  if (row.status_code === 'auth_required') {
    return { authRequired: true }
  }
  if (!row.event_id) {
    return { error: 'Evento não encontrado.' }
  }

  return {
    event: {
      id: row.event_id,
      groupId: row.group_id ?? undefined,
      title: row.title ?? '',
      sport: row.sport ?? '',
      starts_at: row.starts_at ?? '',
      ends_at: row.ends_at ?? '',
      location_name: row.location_name,
      max_participants: row.max_participants ?? 0,
      participant_count: row.participant_count ?? 0,
      groupName: row.group_name ?? undefined,
      visibility: row.visibility ?? undefined,
      isOwner: row.is_owner,
      myStatus: row.my_status,
      isMember: row.is_member,
      hasProfile: row.has_profile,
      profileNickname: row.profile_nickname,
    },
  }
}

export async function confirmAsGuest(
  eventId: string,
  name: string,
): Promise<{ status?: 'confirmed' | 'pending'; error?: string }> {
  const trimmedName = name.trim()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    if (!trimmedName) return { error: 'Informe seu nome' }
    const { error: anonError } = await supabase.auth.signInAnonymously()
    if (anonError) return { error: 'Não foi possível confirmar presença agora. Tente novamente.' }
  }

  try {
    const result = await api.post<{ status: 'confirmed' | 'pending' }>(`/guest-events/${eventId}/confirm`, {
      name: trimmedName || undefined,
    })
    return { status: result.status }
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export async function declineParticipation(eventId: string): Promise<{ error?: string }> {
  try {
    await api.post(`/events/${eventId}/participation/decline`)
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export async function joinWaitlist(eventId: string): Promise<{ error?: string }> {
  try {
    await api.post(`/events/${eventId}/waitlist/join`)
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export async function leaveWaitlist(eventId: string): Promise<{ error?: string }> {
  try {
    await api.post(`/events/${eventId}/waitlist/leave`)
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export async function confirmWaitlistSpot(eventId: string): Promise<{ error?: string }> {
  try {
    await api.post(`/events/${eventId}/waitlist/confirm`)
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export async function approveParticipant(eventId: string, participantUserId: string): Promise<{ error?: string }> {
  try {
    await api.post(`/events/${eventId}/participants/${participantUserId}/approve`)
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export async function rejectParticipant(eventId: string, participantUserId: string): Promise<{ error?: string }> {
  try {
    await api.post(`/events/${eventId}/participants/${participantUserId}/reject`)
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export interface PublicEventCard {
  id: string
  title: string
  sport: string
  starts_at: string
  ends_at: string
  location_name: string | null
  max_participants: number
  participant_count: number
  creator: { name: string; nickname: string; avatar_url?: string } | null
  myStatus: 'confirmed' | 'pending' | 'declined' | null
}

export async function getPublicEventsFeed(sport?: string): Promise<{ events: PublicEventCard[]; error?: string }> {
  try {
    const result = await api.get<{
      events: Array<{
        id: string
        title: string
        sport: string
        starts_at: string
        ends_at: string
        location_name: string | null
        max_participants: number
        participant_count: number
        creator: { name: string; nickname: string; avatar_url?: string } | null
        my_status: 'confirmed' | 'pending' | 'declined' | null
      }>
      total: number
      page: number
      take: number
    }>(`/events/discover${sport ? `?sport=${encodeURIComponent(sport)}` : ''}`)

    return {
      events: result.events.map((e) => ({
        id: e.id,
        title: e.title,
        sport: e.sport,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        location_name: e.location_name,
        max_participants: e.max_participants,
        participant_count: e.participant_count,
        creator: e.creator,
        myStatus: e.my_status,
      })),
    }
  } catch (err) {
    if (err instanceof ApiError) return { events: [], error: err.message }
    throw err
  }
}

export interface MyEventCard {
  id: string
  group_id: string | null
  title: string
  sport: string
  starts_at: string
  ends_at: string
  location_name: string | null
  location_address: string | null
  max_participants: number
  participant_count: number
  event_fee: number | null
  group_name: string | null
  my_status: 'confirmed' | 'pending' | 'declined' | 'waitlist' | 'absent' | 'present' | null
}

export async function getMyEvents(): Promise<{ events: MyEventCard[]; error?: string }> {
  try {
    const result = await api.get<{ events: MyEventCard[] }>('/events/mine')
    return { events: result.events }
  } catch (err) {
    if (err instanceof ApiError) return { events: [], error: err.message }
    throw err
  }
}
