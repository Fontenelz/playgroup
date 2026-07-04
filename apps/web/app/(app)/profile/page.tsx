import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from './_client'
import type { ProfileGroup } from './_client'

interface GroupRow {
  id: string
  name: string
  sport: string
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('id, name, nickname, avatar_url, city, sports')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Get user's groups
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group:groups(id, name, sport)')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const groups: ProfileGroup[] = (memberships ?? [])
    .map((m) => {
      const g = (Array.isArray(m.group) ? m.group[0] : m.group) as GroupRow | null
      return g ? { id: g.id, name: g.name, sport: g.sport } : null
    })
    .filter((g): g is ProfileGroup => g !== null)

  // Get presence count
  const { count: presences } = await supabase
    .from('event_participants')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'present')

  return (
    <ProfileClient
      name={profile.name}
      nickname={profile.nickname}
      avatar_url={profile.avatar_url}
      city={profile.city}
      sports={(profile.sports as string[]) ?? []}
      presences={presences ?? 0}
      groupCount={groups.length}
      groups={groups}
    />
  )
}
