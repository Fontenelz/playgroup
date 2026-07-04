import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreateEventClient } from './_client'

export default async function CreateEventPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const supabase = await createClient()

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, sport, per_event_fee')
    .eq('id', groupId)
    .single()

  if (!group) notFound()

  return <CreateEventClient group={group} />
}
