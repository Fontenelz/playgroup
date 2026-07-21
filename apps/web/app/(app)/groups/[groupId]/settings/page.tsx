import { notFound, redirect } from 'next/navigation'
import { api, ApiError } from '@/lib/api/client'
import SettingsClient from './_client'
import type { SettingsMember } from './_client'

interface GroupDetailResponse {
  group: { id: string; name: string; admin_id: string }
  myRole: string
  members: SettingsMember[]
}

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params

  let data: GroupDetailResponse
  try {
    data = await api.get<GroupDetailResponse>(`/groups/${groupId}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  if (data.myRole !== 'admin') redirect(`/groups/${groupId}`)

  return (
    <SettingsClient
      groupId={groupId}
      groupName={data.group.name}
      groupAdminId={data.group.admin_id}
      members={data.members}
    />
  )
}
