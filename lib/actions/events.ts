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

  const { data: event } = await supabase
    .from('events')
    .select(`
      id, group_id, title, sport, starts_at, ends_at, location_name,
      max_participants, participant_count, status,
      group:groups (name, access_type, deleted_at)
    `)
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Evento não encontrado' }

  const group = (Array.isArray(event.group) ? event.group[0] : event.group) as
    { name: string; access_type: string; deleted_at: string | null } | null

  if (!group || group.deleted_at || group.access_type === 'private') {
    return { error: 'Este evento é privado. Peça um convite para o grupo.' }
  }
  if (!['published', 'open'].includes(event.status)) {
    return { error: 'Este evento não está mais aceitando confirmações.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  let alreadyJoined = false
  let isMember = false
  if (user) {
    const [{ data: existing }, { data: membership }] = await Promise.all([
      supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('group_members')
        .select('id')
        .eq('group_id', event.group_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single(),
    ])
    alreadyJoined = !!existing
    isMember = !!membership
  }

  return {
    event: {
      id: event.id,
      groupId: event.group_id,
      title: event.title,
      sport: event.sport,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      location_name: event.location_name,
      max_participants: event.max_participants,
      participant_count: event.participant_count ?? 0,
      groupName: group.name,
      alreadyJoined,
      isMember,
    },
  }
}

export async function confirmAsGuest(eventId: string, name: string): Promise<{ error?: string }> {
  const trimmedName = name.trim()
  if (!trimmedName) return { error: 'Informe seu nome' }

  const supabase = await createClient()

  let { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) return { error: 'Não foi possível confirmar presença agora. Tente novamente.' }
    user = data.user
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, group_id, max_participants, participant_count, status, group:groups(access_type, deleted_at)')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Evento não encontrado' }

  const group = (Array.isArray(event.group) ? event.group[0] : event.group) as
    { access_type: string; deleted_at: string | null } | null

  if (!group || group.deleted_at || group.access_type === 'private') {
    return { error: 'Este evento é privado.' }
  }
  if (!['published', 'open'].includes(event.status)) {
    return { error: 'Este evento não está mais aceitando confirmações.' }
  }

  // Cria o perfil de convidado só se ainda não existir um perfil para esse usuário
  // (evita sobrescrever o nome de quem já tem conta de verdade).
  const { data: existingProfile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!existingProfile) {
    const { error: profileError } = await supabase.from('users').insert({
      id: user.id,
      name: trimmedName,
      nickname: trimmedName.split(' ')[0] || trimmedName,
      is_guest: true,
    })
    if (profileError) return { error: profileError.message }
  }

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
