import { getPublicEventsFeed } from '@/lib/actions/events'
import { getPublicGroupsFeed } from '@/lib/actions/groups'
import { DiscoverClient } from './_client'

export default async function DiscoverPage() {
  const [eventsResult, groupsResult] = await Promise.all([
    getPublicEventsFeed(),
    getPublicGroupsFeed(),
  ])

  return (
    <DiscoverClient
      events={eventsResult.events}
      eventsError={eventsResult.error}
      groups={groupsResult.groups}
      groupsError={groupsResult.error}
    />
  )
}
