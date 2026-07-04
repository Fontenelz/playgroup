import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RankingClient from './_client'
import type { RankingItem, RankingUser } from './_client'

export default async function RankingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user's groups
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const groupIds = (memberships ?? []).map((m) => m.group_id)

  if (groupIds.length === 0) {
    return <RankingClient ranking={[]} currentUserId={user.id} />
  }

  // Get all events for user's groups
  const { data: eventsRaw } = await supabase
    .from('events')
    .select('id')
    .in('group_id', groupIds)
    .lt('starts_at', new Date().toISOString())

  const eventIds = (eventsRaw ?? []).map((e) => e.id)

  if (eventIds.length === 0) {
    return <RankingClient ranking={[]} currentUserId={user.id} />
  }

  // Get presence records
  const { data: presenceRecords } = await supabase
    .from('event_participants')
    .select('user_id, user:users(id, name, nickname, avatar_url)')
    .in('event_id', eventIds)
    .eq('status', 'present')

  // Aggregate presences per user
  const rankingMap = new Map<string, { user: RankingUser; presences: number }>()
  for (const rec of presenceRecords ?? []) {
    const u = (Array.isArray(rec.user) ? rec.user[0] : rec.user) as RankingUser | null
    if (!u) continue
    const existing = rankingMap.get(rec.user_id)
    if (existing) {
      existing.presences++
    } else {
      rankingMap.set(rec.user_id, {
        user: {
          id: u.id,
          name: u.name,
          nickname: u.nickname,
          avatar_url: u.avatar_url,
        },
        presences: 1,
      })
    }
  }

  const ranking: RankingItem[] = Array.from(rankingMap.entries())
    .map(([user_id, { user: u, presences }]) => ({ user_id, user: u, presences }))
    .sort((a, b) => b.presences - a.presences)

  return <RankingClient ranking={ranking} currentUserId={user.id} />
}
