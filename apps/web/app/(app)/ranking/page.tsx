import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api/client'
import RankingClient from './_client'
import type { RankingItem } from './_client'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { ranking } = await api.get<{ ranking: RankingItem[] }>('/ranking')

  return <RankingClient ranking={ranking} currentUserId={user!.id} />
}
