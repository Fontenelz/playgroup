import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { api, ApiError } from '@/lib/api/client'
import GroupPageClient from './_client'
import type { GroupDetail, EventItem, MemberItem, RankingEntry } from './_client'

interface GroupDetailResponse {
  group: GroupDetail
  myRole: string
  memberCount: number
  events: EventItem[]
  members: MemberItem[]
  pendingRequests: MemberItem[]
  ranking: RankingEntry[]
}

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let data: GroupDetailResponse
  try {
    data = await api.get<GroupDetailResponse>(`/groups/${groupId}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  return (
    <GroupPageClient
      groupId={groupId}
      currentUserId={user!.id}
      group={data.group}
      myRole={data.myRole}
      memberCount={data.memberCount}
      events={data.events}
      members={data.members}
      pendingRequests={data.pendingRequests}
      ranking={data.ranking}
    />
  )
}
