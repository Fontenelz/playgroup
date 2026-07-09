import { notFound } from 'next/navigation'
import { api, ApiError } from '@/lib/api/client'
import { CreateEventClient } from './_client'

interface GroupBasic {
  id: string
  name: string
  sport: string
  per_event_fee: number | null
}

export default async function CreateEventPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params

  let group: GroupBasic
  try {
    group = await api.get<GroupBasic>(`/groups/${groupId}/basic`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  return <CreateEventClient group={group} />
}
