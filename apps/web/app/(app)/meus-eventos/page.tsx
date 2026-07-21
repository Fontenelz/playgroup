import { getMyEvents } from '@/lib/actions/events'
import { MeusEventosClient } from './_client'

export default async function MeusEventosPage() {
  const { events, error } = await getMyEvents()

  return <MeusEventosClient events={events} error={error} />
}
