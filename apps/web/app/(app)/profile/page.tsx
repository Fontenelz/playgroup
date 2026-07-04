import { redirect } from 'next/navigation'
import { api } from '@/lib/api/client'
import ProfileClient from './_client'
import type { ProfileGroup } from './_client'

interface ProfileSummaryResponse {
  profile: {
    name: string
    nickname: string
    avatarUrl: string | null
    city: string | null
    sports: string[]
  } | null
  groups: ProfileGroup[]
  presences: number
}

export default async function ProfilePage() {
  const data = await api.get<ProfileSummaryResponse>('/users/me/summary')

  if (!data.profile) redirect('/onboarding')

  return (
    <ProfileClient
      name={data.profile.name}
      nickname={data.profile.nickname}
      avatar_url={data.profile.avatarUrl}
      city={data.profile.city}
      sports={data.profile.sports ?? []}
      presences={data.presences}
      groupCount={data.groups.length}
      groups={data.groups}
    />
  )
}
