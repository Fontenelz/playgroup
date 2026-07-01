import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JoinGroupClient, { InvalidCodeView } from './_client'
import type { JoinGroup, JoinMember } from './_client'

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

  const { data: previewRows, error: previewError } = await supabase
    .rpc('get_invite_preview', { p_code: code })
    .single()

  const preview = previewRows as {
    is_valid: boolean
    group_id: string | null
    group_name: string | null
    description: string | null
    sport: string | null
    access_type: string | null
    monthly_fee: number | null
    per_event_fee: number | null
    payment_day: number | null
    member_count: number
    is_member: boolean
  } | null

  if (previewError || !preview || !preview.is_valid || !preview.group_id) {
    return <InvalidCodeView />
  }

  const group: JoinGroup = {
    id: preview.group_id,
    name: preview.group_name ?? '',
    description: preview.description,
    sport: preview.sport ?? '',
    access_type: preview.access_type ?? 'invite',
    monthly_fee: preview.monthly_fee,
    per_event_fee: preview.per_event_fee,
    payment_day: preview.payment_day,
  }

  const { data: membersRaw } = await supabase.rpc('get_invite_members', { p_code: code })

  const members: JoinMember[] = (
    (membersRaw ?? []) as {
      member_id: string
      role: string
      user_id: string
      name: string
      nickname: string | null
      avatar_url: string | null
    }[]
  ).map((m) => ({
    id: m.member_id,
    role: m.role,
    user: { id: m.user_id, name: m.name, nickname: m.nickname, avatar_url: m.avatar_url },
  }))

  return (
    <JoinGroupClient
      code={code}
      group={group}
      memberCount={preview.member_count}
      members={members}
      isMember={preview.is_member}
    />
  )
}
