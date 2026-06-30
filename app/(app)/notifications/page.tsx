import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NotificationsClient from './_client'
import type { Notification } from '@/types/app.types'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifRaw } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, data, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications: Notification[] = (notifRaw ?? []).map((n) => ({
    id: n.id,
    user_id: n.user_id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: (n.data ?? {}) as Record<string, string>,
    is_read: n.is_read ?? false,
    created_at: n.created_at,
  }))

  return <NotificationsClient initialNotifications={notifications} />
}
