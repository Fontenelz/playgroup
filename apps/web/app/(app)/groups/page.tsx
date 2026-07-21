import { api } from '@/lib/api/client'
import { SquadsClient } from './_client'
import type { SquadItem } from './_client'

export default async function GroupsPage() {
  const groups = await api.get<SquadItem[]>('/groups')

  return <SquadsClient groups={groups} />
}
