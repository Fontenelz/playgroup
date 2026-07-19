import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api/client'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { getSportCoverUrl } from '@/lib/sport-images'
import JoinGroupClient, { InvalidCodeView } from './_client'
import type { JoinGroup, JoinMember } from './_client'

interface InvitePreviewResponse {
  is_valid: boolean
  group_id?: string
  group_name?: string
  description?: string | null
  sport?: string
  access_type?: string
  monthly_fee?: number | null
  per_event_fee?: number | null
  payment_day?: number | null
  member_count?: number
  is_member?: boolean
  members?: { id: string; role: string; user: { id: string; name: string; nickname: string | null; avatar_url: string | null } }[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code: rawCode } = await params
  const code = decodeURIComponent(rawCode)

  const preview = await api
    .get<InvitePreviewResponse>(`/invites/${encodeURIComponent(code)}`)
    .catch(() => null)

  if (!preview?.is_valid || !preview.group_id) {
    return { title: 'Convite inválido — PlayGroup' }
  }

  const sport = SPORT_MAP[preview.sport as SportId] ?? SPORT_MAP.other
  const title = `${preview.group_name} — Convite no PlayGroup`
  const description = `${sport.emoji} ${sport.label} · ${preview.member_count ?? 0} membros. Entre no grupo pelo PlayGroup.`
  const image = getSportCoverUrl(preview.sport as SportId, 1200)

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 900 }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code: rawCode } = await params
  const code = decodeURIComponent(rawCode)
  const supabase = await createClient()

  // Preview funciona sem login (bots de link-preview e visitantes anônimos);
  // login só é exigido na ação de entrar no grupo.
  const { data: { user } } = await supabase.auth.getUser()

  const preview = await api.get<InvitePreviewResponse>(`/invites/${encodeURIComponent(code)}`).catch(() => null)

  if (!preview || !preview.is_valid || !preview.group_id) {
    return <InvalidCodeView />
  }

  const group: JoinGroup = {
    id: preview.group_id,
    name: preview.group_name ?? '',
    description: preview.description ?? null,
    sport: preview.sport ?? '',
    access_type: preview.access_type ?? 'invite',
    monthly_fee: preview.monthly_fee ?? null,
    per_event_fee: preview.per_event_fee ?? null,
    payment_day: preview.payment_day ?? null,
  }

  const members: JoinMember[] = (preview.members ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    user: m.user,
  }))

  return (
    <JoinGroupClient
      code={code}
      group={group}
      memberCount={preview.member_count ?? 0}
      members={members}
      isMember={preview.is_member ?? false}
      isLoggedIn={!!user}
    />
  )
}
