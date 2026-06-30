import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EventPageClient from './_client'
import type { EventFull, GroupBasic, ParticipantItem, WaitlistItem } from './_client'
import type { ParticipantStatus } from '@/types/app.types'

interface UserRef {
  id: string
  name: string
  nickname: string | null
  avatar_url: string | null
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>
}) {
  const { groupId, eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch event
  const { data: eventRaw } = await supabase
    .from('events')
    .select('id, title, sport, starts_at, ends_at, location_name, location_address, max_participants, monthly_slots, participant_count, status, event_fee, notes')
    .eq('id', eventId)
    .single()

  if (!eventRaw) notFound()

  // Fetch group + membership
  const { data: membershipData } = await supabase
    .from('group_members')
    .select('role, group:groups(id, name, sport, per_event_fee)')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membershipData) notFound()

  const groupRaw = (Array.isArray(membershipData.group) ? membershipData.group[0] : membershipData.group) as {
    id: string; name: string; sport: string; per_event_fee: number | null
  } | null

  if (!groupRaw) notFound()

  const event: EventFull = {
    id: eventRaw.id,
    title: eventRaw.title,
    sport: eventRaw.sport,
    starts_at: eventRaw.starts_at,
    ends_at: eventRaw.ends_at,
    location_name: eventRaw.location_name,
    location_address: eventRaw.location_address,
    max_participants: eventRaw.max_participants,
    monthly_slots: eventRaw.monthly_slots ?? 0,
    participant_count: eventRaw.participant_count ?? 0,
    status: eventRaw.status,
    event_fee: eventRaw.event_fee,
    notes: eventRaw.notes,
  }

  const group: GroupBasic = {
    id: groupRaw.id,
    name: groupRaw.name,
    sport: groupRaw.sport,
    per_event_fee: groupRaw.per_event_fee,
    my_role: membershipData.role,
  }

  // Fetch participants (confirmed + pending + present)
  const { data: participantsRaw } = await supabase
    .from('event_participants')
    .select('id, event_id, user_id, status, participant_type, confirmed_at, user:users(id, name, nickname, avatar_url)')
    .eq('event_id', eventId)
    .in('status', ['confirmed', 'pending', 'present', 'absent'])
    .order('confirmed_at', { ascending: true })

  // Fetch waitlist
  const { data: waitlistRaw } = await supabase
    .from('event_participants')
    .select('id, user_id, confirmed_at, user:users(id, name, nickname, avatar_url)')
    .eq('event_id', eventId)
    .eq('status', 'waitlist')
    .order('confirmed_at', { ascending: true })

  // Fetch declined
  const { data: declinedRaw } = await supabase
    .from('event_participants')
    .select('id, event_id, user_id, status, participant_type, user:users(id, name, nickname, avatar_url)')
    .eq('event_id', eventId)
    .eq('status', 'declined')

  // Fetch my status
  const { data: myParticipation } = await supabase
    .from('event_participants')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single()

  const participants: ParticipantItem[] = (participantsRaw ?? []).map((p) => {
    const u = (Array.isArray(p.user) ? p.user[0] : p.user) as UserRef | null
    return {
      id: p.id,
      event_id: p.event_id,
      user_id: p.user_id,
      user: u ?? { id: p.user_id, name: '', nickname: null, avatar_url: null },
      status: p.status as ParticipantStatus,
      participant_type: p.participant_type,
      confirmed_at: p.confirmed_at,
    }
  })

  const waitlist: WaitlistItem[] = (waitlistRaw ?? []).map((w) => {
    const u = (Array.isArray(w.user) ? w.user[0] : w.user) as UserRef | null
    return {
      id: w.id,
      user_id: w.user_id,
      user: u ?? { id: w.user_id, name: '', nickname: null, avatar_url: null },
      confirmed_at: w.confirmed_at,
    }
  })

  const declinedParticipants: ParticipantItem[] = (declinedRaw ?? []).map((p) => {
    const u = (Array.isArray(p.user) ? p.user[0] : p.user) as UserRef | null
    return {
      id: p.id,
      event_id: p.event_id,
      user_id: p.user_id,
      user: u ?? { id: p.user_id, name: '', nickname: null, avatar_url: null },
      status: 'declined' as ParticipantStatus,
      participant_type: p.participant_type,
    }
  })

  const initialMyStatus = myParticipation?.status as ParticipantStatus | null ?? null

  return (
    <EventPageClient
      groupId={groupId}
      eventId={eventId}
      currentUserId={user.id}
      event={event}
      group={group}
      participants={participants}
      waitlist={waitlist}
      declinedParticipants={declinedParticipants}
      initialMyStatus={initialMyStatus}
    />
  )
}
