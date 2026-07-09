import { notFound, redirect } from 'next/navigation'
import { api, ApiError } from '@/lib/api/client'
import SortearClient from '@/app/(app)/groups/[groupId]/events/[eventId]/sortear/_client'
import type { ConfirmedParticipant } from '@/app/(app)/groups/[groupId]/events/[eventId]/sortear/_client'

interface DrawResponse {
  eventTitle: string
  confirmedParticipants: ConfirmedParticipant[]
}

export default async function StandaloneSortearPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  let data: DrawResponse
  try {
    data = await api.get<DrawResponse>(`/events/${eventId}/draw`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) redirect(`/e/${eventId}`)
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  return (
    <SortearClient
      eventTitle={data.eventTitle}
      confirmedParticipants={data.confirmedParticipants}
    />
  )
}
