import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { api, ApiError } from '@/lib/api/client'
import ManageEventClient from './_client'
import type { ManageEventFull, ManageParticipantItem } from './_client'

interface EventDetailResponse {
  event: ManageEventFull
  group: unknown
  visibility: 'link_only' | 'public' | null
  isOwner: boolean
  participants: ManageParticipantItem[]
  waitlist: ManageParticipantItem[]
  declinedParticipants: ManageParticipantItem[]
}

export default async function ManageEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/e/${eventId}/gerenciar`)}`)

  let data: EventDetailResponse
  try {
    data = await api.get<EventDetailResponse>(`/events/${eventId}`)
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound()
    throw err
  }

  if (data.group || !data.isOwner) {
    redirect(`/e/${eventId}`)
  }

  return (
    <ManageEventClient
      eventId={eventId}
      event={data.event}
      visibility={data.visibility}
      participants={data.participants}
      waitlist={data.waitlist}
      declinedParticipants={data.declinedParticipants}
    />
  )
}
