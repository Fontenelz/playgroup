import { getPublicEventsFeed } from '@/lib/actions/events'
import { DiscoverEventsClient } from './_client'

export default async function DiscoverEventsPage() {
  const { events, error } = await getPublicEventsFeed()
  return <DiscoverEventsClient events={events} error={error} />
}
