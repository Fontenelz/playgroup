import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { api, ApiError } from '@/lib/api/client'
import EventPageClient from './_client'
import type { EventFull, GroupBasic, ParticipantItem, WaitlistItem } from './_client'
import type { ParticipantStatus } from '@/types/app.types'

interface EventDetailResponse {
  event: EventFull
  group: GroupBasic
  participants: ParticipantItem[]
  waitlist: WaitlistItem[]
  declinedParticipants: ParticipantItem[]
  myStatus: ParticipantStatus | null
  myWaitlist: { status: 'waiting' | 'notified'; expires_at: string | null } | null
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>
}) {
  const { groupId, eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let data: EventDetailResponse
  try {
    data = await api.get<EventDetailResponse>(`/events/${eventId}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  return (
    <EventPageClient
      groupId={groupId}
      eventId={eventId}
      currentUserId={user!.id}
      event={data.event}
      group={data.group}
      participants={data.participants}
      waitlist={data.waitlist}
      declinedParticipants={data.declinedParticipants}
      initialMyStatus={data.myStatus}
      initialMyWaitlist={data.myWaitlist}
    />
  )
}
