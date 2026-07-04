import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api/client'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await api.get<{ city: string | null } | null>('/users/me')

  if (!profile?.city) {
    redirect('/onboarding')
  }

  redirect('/home')
}
