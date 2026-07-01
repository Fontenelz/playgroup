import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FinanceiroClient from './_client'
import type { FinanceiroParticipant } from './_client'

interface ParticipantUser {
  id: string
  name: string
  nickname: string | null
  avatar_url: string | null
}

export default async function FinanceiroPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>
}) {
  const { groupId, eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check organizer role
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const isOrganizer = membership?.role === 'admin' || membership?.role === 'organizer'
  if (!isOrganizer) redirect(`/groups/${groupId}/events/${eventId}`)

  // Get event
  const { data: event } = await supabase
    .from('events')
    .select('id, title, event_fee, group:groups(per_event_fee)')
    .eq('id', eventId)
    .single()

  if (!event) notFound()

  const groupFee = (Array.isArray(event.group) ? event.group[0] : event.group) as { per_event_fee: number | null } | null
  const fee = event.event_fee ?? groupFee?.per_event_fee ?? 0

  // Get confirmed participants
  const { data: participantsRaw } = await supabase
    .from('event_participants')
    .select('id, user_id, is_monthly, user:users(id, name, nickname, avatar_url)')
    .eq('event_id', eventId)
    .in('status', ['confirmed', 'present'])
    .order('confirmed_at', { ascending: true })

  const participants: FinanceiroParticipant[] = (participantsRaw ?? [])
    .flatMap((p) => {
      const u = (Array.isArray(p.user) ? p.user[0] : p.user) as ParticipantUser | null
      if (!u) return []
      const item: FinanceiroParticipant = {
        id:         p.id,
        user_id:    p.user_id,
        name:       u.name,
        nickname:   u.nickname ?? u.name.split(' ')[0],
        avatar_url: u.avatar_url ?? undefined,
        is_monthly: p.is_monthly ?? false,
      }
      return [item]
    })

  return (
    <FinanceiroClient
      eventTitle={event.title}
      fee={fee}
      participants={participants}
    />
  )
}
