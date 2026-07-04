import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GroupPageClient from './_client'
import type { GroupDetail, EventItem, MemberItem, RankingEntry } from './_client'

interface UserRef {
  id: string
  name: string
  nickname: string | null
  avatar_url: string | null
}

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get membership + group data
  const { data: membershipData } = await supabase
    .from('group_members')
    .select(`
      role,
      member_type,
      group:groups (
        id, name, description, sport,
        monthly_fee, per_event_fee, payment_day,
        plan, admin_id, access_type, max_members
      )
    `)
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membershipData) notFound()

  const group = (Array.isArray(membershipData.group) ? membershipData.group[0] : membershipData.group) as GroupDetail | null
  if (!group) notFound()

  const myRole = membershipData.role

  // Get all events for this group
  const { data: eventsRaw } = await supabase
    .from('events')
    .select('id, title, starts_at, ends_at, location_name, max_participants, participant_count, notes')
    .eq('group_id', groupId)
    .order('starts_at', { ascending: false })

  const eventIds = (eventsRaw ?? []).map((e) => e.id)

  // Get my participation statuses
  const { data: myParticipations } = eventIds.length > 0
    ? await supabase
        .from('event_participants')
        .select('event_id, status')
        .eq('user_id', user.id)
        .in('event_id', eventIds)
    : { data: [] }

  const myStatusMap = Object.fromEntries(
    (myParticipations ?? []).map((p) => [p.event_id, p.status as string]),
  )

  const events: EventItem[] = (eventsRaw ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    location_name: e.location_name,
    max_participants: e.max_participants,
    participant_count: e.participant_count ?? 0,
    notes: e.notes,
    my_status: myStatusMap[e.id] ?? null,
  }))

  // Get members
  const { data: membersRaw } = await supabase
    .from('group_members')
    .select('id, role, member_type, skill_rating, user_id, user:users(id, name, nickname, avatar_url)')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .order('joined_at')

  const members: MemberItem[] = (membersRaw ?? []).map((m) => {
    const userObj = (Array.isArray(m.user) ? m.user[0] : m.user) as UserRef | null
    return {
      id: m.id,
      role: m.role,
      member_type: m.member_type,
      skill_rating: m.skill_rating ?? 0,
      user_id: m.user_id,
      user: userObj ?? { id: m.user_id, name: '', nickname: null, avatar_url: null },
    }
  })

  const memberCount = members.length

  // Get ranking from presences (past events only)
  const pastEventIds = events
    .filter((e) => new Date(e.starts_at) < new Date())
    .map((e) => e.id)

  let ranking: RankingEntry[] = []
  if (pastEventIds.length > 0) {
    const { data: presenceRecords } = await supabase
      .from('event_participants')
      .select('user_id, user:users(id, name, nickname, avatar_url)')
      .in('event_id', pastEventIds)
      .eq('status', 'present')

    const rankingMap = new Map<string, { user: UserRef; presences: number }>()
    for (const rec of presenceRecords ?? []) {
      const u = (Array.isArray(rec.user) ? rec.user[0] : rec.user) as UserRef | null
      if (!u) continue
      const existing = rankingMap.get(rec.user_id)
      if (existing) {
        existing.presences++
      } else {
        rankingMap.set(rec.user_id, { user: u, presences: 1 })
      }
    }

    ranking = Array.from(rankingMap.entries())
      .map(([user_id, { user: u, presences }]) => ({ user_id, user: u, presences }))
      .sort((a, b) => b.presences - a.presences)
  }

  return (
    <GroupPageClient
      groupId={groupId}
      currentUserId={user.id}
      group={group}
      myRole={myRole}
      memberCount={memberCount}
      events={events}
      members={members}
      ranking={ranking}
    />
  )
}
