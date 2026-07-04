import { api } from '@/lib/api/client'
import NotificationsClient from './_client'
import type { Notification } from '@/types/app.types'

export default async function NotificationsPage() {
  const notifications = await api.get<Notification[]>('/notifications')

  return <NotificationsClient initialNotifications={notifications} />
}
