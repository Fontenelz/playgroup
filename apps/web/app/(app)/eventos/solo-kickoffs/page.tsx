import { getPublicEventsFeed } from '@/lib/actions/events'
import { SoloKickoffsClient } from './_client'

export default async function SoloKickoffsPage() {
  const { events, error } = await getPublicEventsFeed()

  return <SoloKickoffsClient events={events} error={error} />
}
