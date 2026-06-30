import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JoinGroupClient, { InvalidCodeView } from './_client'
import type { JoinGroup, JoinMember } from './_client'

interface MemberRow {
  id: string
  role: string
  user: { id: string; name: string; nickname: string | null; avatar_url: string | null } | null
}

export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code: rawCode } = await params
  const code = decodeURIComponent(rawCode)
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/join/${rawCode}`)}`)

  // Find invite code
  const { data: invite } = await supabase
    .from('invite_codes')
    .select(`
      id, code, expires_at, max_uses, uses,
      group:groups (
        id, name, description, sport, access_type,
        monthly_fee, per_event_fee, payment_day
      )
    `)
    .eq('code', code)
    .single()

  // Check if invalid or expired
  const isInvalid =
    !invite ||
    (invite.expires_at && new Date(invite.expires_at) < new Date()) ||
    (invite.max_uses !== null && invite.uses >= invite.max_uses)

  if (isInvalid) {
    return <InvalidCodeView />
  }

  const groupRaw = (Array.isArray(invite.group) ? invite.group[0] : invite.group) as JoinGroup | null
  if (!groupRaw) {
    return <InvalidCodeView />
  }

  const group: JoinGroup = {
    id: groupRaw.id,
    name: groupRaw.name,
    description: groupRaw.description,
    sport: groupRaw.sport,
    access_type: groupRaw.access_type,
    monthly_fee: groupRaw.monthly_fee,
    per_event_fee: groupRaw.per_event_fee,
    payment_day: groupRaw.payment_day,
  }

  // Get member count
  const { count: memberCount } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group.id)
    .eq('status', 'active')

  // Get preview members
  const { data: membersRaw } = await supabase
    .from('group_members')
    .select('id, role, user:users(id, name, nickname, avatar_url)')
    .eq('group_id', group.id)
    .eq('status', 'active')
    .order('joined_at')
    .limit(8)

  const members: JoinMember[] = (membersRaw ?? [])
    .map((m) => {
      const u = (Array.isArray(m.user) ? m.user[0] : m.user) as MemberRow['user'] | null
      return {
        id: m.id,
        role: m.role,
        user: u ?? { id: '', name: '', nickname: null, avatar_url: null },
      }
    })
    .filter((m) => m.user.id !== '')

  // Check if user is already a member
  const { data: existingMembership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single()

  const isMember = !!existingMembership

  return (
    <JoinGroupClient
      code={code}
      group={group}
      memberCount={memberCount ?? 0}
      members={members}
      isMember={isMember}
    />
  )
}
