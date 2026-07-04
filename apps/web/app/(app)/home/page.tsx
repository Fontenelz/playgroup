import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomeClient from './_client'
import type { HomeUser, HomeGroup, HomeEvent, HomeNotification } from './_client'

interface GroupRow {
  id: string
  name: string
  sport: string
}


export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('id, name, nickname, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const homeUser: HomeUser = {
    id: profile.id,
    name: profile.name,
    nickname: profile.nickname,
    avatar_url: profile.avatar_url,
  }

  // Get user's group memberships
  const { data: memberships } = await supabase
    .from('group_members')
    .select('role, group:groups(id, name, sport)')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const groupIds: string[] = []
  const groupMap = new Map<string, { name: string; sport: string; my_role: string }>()

  for (const m of memberships ?? []) {
    const g = (Array.isArray(m.group) ? m.group[0] : m.group) as GroupRow | null
    if (!g) continue
    groupIds.push(g.id)
    groupMap.set(g.id, { name: g.name, sport: g.sport, my_role: m.role })
  }

  // Get member counts for user's groups
  const { data: allGroupMembers } = groupIds.length > 0
    ? await supabase
        .from('group_members')
        .select('group_id')
        .in('group_id', groupIds)
        .eq('status', 'active')
    : { data: [] }

  const memberCountMap = (allGroupMembers ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.group_id] = (acc[m.group_id] ?? 0) + 1
    return acc
  }, {})

  const groups: HomeGroup[] = Array.from(groupMap.entries()).map(([id, g]) => ({
    id,
    name: g.name,
    sport: g.sport,
    member_count: memberCountMap[id] ?? 0,
    my_role: g.my_role,
  }))

  // Get upcoming events for user's groups
  let events: HomeEvent[] = []
  if (groupIds.length > 0) {
    const { data: eventsRaw } = await supabase
      .from('events')
      .select('id, group_id, sport, starts_at, ends_at, max_participants, participant_count, group:groups(name)')
      .in('group_id', groupIds)
      .gt('starts_at', new Date().toISOString())
      .eq('status', 'published')
      .order('starts_at')
      .limit(5)

    const eventIds = (eventsRaw ?? []).map((e) => e.id)

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

    events = (eventsRaw ?? []).map((e) => {
      const g = (Array.isArray(e.group) ? e.group[0] : e.group) as { name: string } | null
      return {
        id: e.id,
        group_id: e.group_id,
        sport: e.sport,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        max_participants: e.max_participants,
        participant_count: e.participant_count ?? 0,
        my_status: myStatusMap[e.id] ?? null,
        group_name: g?.name ?? '',
      }
    })
  }

  // Get recent notifications
  const { data: notifRaw } = await supabase
    .from('notifications')
    .select('id, type, title, body, data, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const notifications: HomeNotification[] = (notifRaw ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: (n.data ?? {}) as Record<string, string>,
    is_read: n.is_read ?? false,
    created_at: n.created_at,
  }))

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <HomeClient
      user={homeUser}
      groups={groups}
      events={events}
      notifications={notifications}
      unreadCount={unreadCount}
    />
  )
}
