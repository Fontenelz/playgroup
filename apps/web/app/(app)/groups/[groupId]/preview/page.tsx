import { notFound } from 'next/navigation'
import { api, ApiError } from '@/lib/api/client'
import GroupPreviewClient from './_client'
import type { GroupPreviewData } from './_client'

export default async function GroupPreviewPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params

  let preview: GroupPreviewData
  try {
    preview = await api.get<GroupPreviewData>(`/groups/${groupId}/preview`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()
    throw err
  }

  return <GroupPreviewClient groupId={groupId} preview={preview} />
}
