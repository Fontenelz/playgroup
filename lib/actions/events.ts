'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SPORT_MAP } from '@/lib/constants'

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
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Não autenticado' }

  const { data: group } = await supabase
    .from('groups')
    .select('sport')
    .eq('id', groupId)
    .single()

  if (!group) return { error: 'Grupo não encontrado' }

  const sportLabel = SPORT_MAP[group.sport as keyof typeof SPORT_MAP]?.label ?? group.sport

  const startsAt = new Date(`${input.date}T${input.startTime}:00`)
  const endsAt   = new Date(`${input.date}T${input.endTime}:00`)
  if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1)

  const dateLabel = startsAt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
  const title = `${sportLabel} · ${dateLabel}`

  const isRecurring = input.recurrence !== 'none'
  let recurrenceRule: string | null = null
  if (isRecurring) {
    const freq = input.recurrence === 'biweekly' ? 'WEEKLY;INTERVAL=2' : input.recurrence.toUpperCase()
    const byday =
      (input.recurrence === 'weekly' || input.recurrence === 'biweekly') && input.weekDays.length
        ? `;BYDAY=${input.weekDays.join(',')}`
        : ''
    const until = input.seriesEnd ? `;UNTIL=${input.seriesEnd.replace(/-/g, '')}` : ''
    recurrenceRule = `FREQ=${freq}${byday}${until}`
  }

  let confirmDeadline: string | null = null
  if (isRecurring && input.monthlySlots > 0 && input.monthlyConfirmHours > 0) {
    confirmDeadline = new Date(
      startsAt.getTime() - input.monthlyConfirmHours * 60 * 60 * 1000,
    ).toISOString()
  }

  const fee = parseFloat(input.eventFee) || null

  const { error } = await supabase.from('events').insert({
    group_id:                groupId,
    title,
    sport:                   group.sport,
    starts_at:               startsAt.toISOString(),
    ends_at:                 endsAt.toISOString(),
    location_name:           input.locationName  || null,
    location_address:        input.locationAddress || null,
    max_participants:        input.maxParticipants,
    monthly_slots:           input.monthlySlots,
    status:                  'published',
    is_recurring:            isRecurring,
    recurrence_rule:         recurrenceRule,
    monthly_confirm_deadline: confirmDeadline,
    event_fee:               fee,
    notes:                   input.notes || null,
    created_by:              user.id,
  })

  if (error) return { error: error.message }

  redirect(`/groups/${groupId}`)
}

export async function confirmParticipation(eventId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Get event
  const { data: event } = await supabase
    .from('events')
    .select('id, group_id, max_participants, participant_count')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Evento não encontrado' }

  // Check if user is a group member
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', event.group_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) return { error: 'Você não é membro deste grupo' }

  const hasSpace = (event.participant_count ?? 0) < event.max_participants
  const status = hasSpace ? 'confirmed' : 'pending'

  const { error } = await supabase
    .from('event_participants')
    .upsert(
      {
        event_id: eventId,
        user_id: user.id,
        status,
        confirmed_at: hasSpace ? new Date().toISOString() : null,
      },
      { onConflict: 'event_id,user_id' },
    )

  if (error) return { error: error.message }

  if (hasSpace) {
    await supabase
      .from('events')
      .update({ participant_count: (event.participant_count ?? 0) + 1 })
      .eq('id', eventId)
      .eq('participant_count', event.participant_count)
  }

  return {}
}

export interface GuestEventPreview {
  id: string
  groupId: string
  title: string
  sport: string
  starts_at: string
  ends_at: string
  location_name: string | null
  max_participants: number
  participant_count: number
  groupName: string
  alreadyJoined: boolean
  isMember: boolean
}

export async function getGuestEventPreview(eventId: string): Promise<{ event?: GuestEventPreview; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_guest_event_preview', { p_event_id: eventId })
    .single()

  const row = data as {
    is_valid: boolean
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
    already_joined: boolean
    is_member: boolean
  } | null

  if (error || !row || !row.is_valid || !row.event_id || !row.group_id) {
    return { error: 'Este evento não existe ou não aceita mais participação avulsa.' }
  }

  return {
    event: {
      id: row.event_id,
      groupId: row.group_id,
      title: row.title ?? '',
      sport: row.sport ?? '',
      starts_at: row.starts_at ?? '',
      ends_at: row.ends_at ?? '',
      location_name: row.location_name,
      max_participants: row.max_participants ?? 0,
      participant_count: row.participant_count ?? 0,
      groupName: row.group_name ?? '',
      alreadyJoined: row.already_joined,
      isMember: row.is_member,
    },
  }
}

export async function confirmAsGuest(eventId: string, name: string): Promise<{ error?: string }> {
  const trimmedName = name.trim()
  if (!trimmedName) return { error: 'Informe seu nome' }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { error: anonError } = await supabase.auth.signInAnonymously()
    if (anonError) return { error: 'Não foi possível confirmar presença agora. Tente novamente.' }
  }

  const { error } = await supabase.rpc('confirm_event_guest', {
    p_event_id: eventId,
    p_name: trimmedName,
  })

  if (error) return { error: error.message }
  return {}
}

export async function declineParticipation(eventId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('event_participants')
    .upsert(
      { event_id: eventId, user_id: user.id, status: 'declined' },
      { onConflict: 'event_id,user_id' },
    )

  if (error) return { error: error.message }
  return {}
}
