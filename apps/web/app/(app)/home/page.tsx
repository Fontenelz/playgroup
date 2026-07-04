import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api/client'
import HomeClient from './_client'
import type { HomeUser, HomeGroup, HomeEvent, HomeNotification } from './_client'

interface HomeResponse {
  profile: HomeUser | null
  groups: HomeGroup[]
  events: HomeEvent[]
  notifications: HomeNotification[]
  unreadCount: number
}

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await api.get<HomeResponse>('/home')

  if (!data.profile) redirect('/onboarding')

  return (
    <HomeClient
      user={data.profile}
      groups={data.groups}
      events={data.events}
      notifications={data.notifications}
      unreadCount={data.unreadCount}
    />
  )
}
