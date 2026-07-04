import { notFound, redirect } from 'next/navigation'
import { api, ApiError } from '@/lib/api/client'
import SortearClient from './_client'
import type { ConfirmedParticipant } from './_client'

interface DrawResponse {
  eventTitle: string
  confirmedParticipants: ConfirmedParticipant[]
}

export default async function SortearPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>
}) {
  const { groupId, eventId } = await params

  try {
    const data = await api.get<DrawResponse>(`/events/${eventId}/draw`)
    return (
      <SortearClient
        eventTitle={data.eventTitle}
        confirmedParticipants={data.confirmedParticipants}
      />
    )
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) redirect(`/groups/${groupId}/events/${eventId}`)
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }
}
