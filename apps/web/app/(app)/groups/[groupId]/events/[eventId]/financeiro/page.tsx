import { notFound, redirect } from 'next/navigation'
import { api, ApiError } from '@/lib/api/client'
import FinanceiroClient from './_client'
import type { FinanceiroParticipant } from './_client'

interface FinanceResponse {
  eventTitle: string
  fee: number
  participants: FinanceiroParticipant[]
}

export default async function FinanceiroPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>
}) {
  const { groupId, eventId } = await params

  let data: FinanceResponse
  try {
    data = await api.get<FinanceResponse>(`/events/${eventId}/finance`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) redirect(`/groups/${groupId}/events/${eventId}`)
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  return (
    <FinanceiroClient
      eventTitle={data.eventTitle}
      fee={data.fee}
      participants={data.participants}
    />
  )
}
