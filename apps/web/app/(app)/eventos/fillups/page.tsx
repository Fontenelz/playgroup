import { getPublicEventsFeed } from '@/lib/actions/events'
import { FillUpsClient } from './_client'

export default async function FillUpsPage() {
  const { events, error } = await getPublicEventsFeed()

  return <FillUpsClient events={events} error={error} />
}
