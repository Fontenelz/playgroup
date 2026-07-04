import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SortearClient from './_client'
import type { ConfirmedParticipant } from './_client'
import type { SkillLevel } from '@/types/app.types'

interface ParticipantUser {
  id: string
  name: string
  nickname: string | null
  avatar_url: string | null
  skill_level: string | null
}

export default async function SortearPage({
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
    .select('id, title')
    .eq('id', eventId)
    .single()

  if (!event) notFound()

  // Get confirmed participants with skill_level from users
  const { data: participantsRaw } = await supabase
    .from('event_participants')
    .select('user_id, user:users(id, name, nickname, avatar_url, skill_level)')
    .eq('event_id', eventId)
    .eq('status', 'confirmed')

  const validSkillLevels: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'professional']

  const confirmedParticipants: ConfirmedParticipant[] = (participantsRaw ?? [])
    .flatMap((p) => {
      const u = (Array.isArray(p.user) ? p.user[0] : p.user) as ParticipantUser | null
      if (!u) return []
      const skillLevel = validSkillLevels.includes(u.skill_level as SkillLevel)
        ? (u.skill_level as SkillLevel)
        : 'intermediate'
      const item: ConfirmedParticipant = {
        user_id:     p.user_id,
        name:        u.name,
        nickname:    u.nickname ?? u.name.split(' ')[0],
        avatar_url:  u.avatar_url ?? undefined,
        skill_level: skillLevel,
      }
      return [item]
    })

  return (
    <SortearClient
      eventTitle={event.title}
      confirmedParticipants={confirmedParticipants}
    />
  )
}
