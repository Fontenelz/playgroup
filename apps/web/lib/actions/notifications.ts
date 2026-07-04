'use server'

import { api, ApiError } from '@/lib/api/client'

export async function markNotificationRead(id: string): Promise<{ error?: string }> {
  try {
    await api.post(`/notifications/${id}/read`)
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  try {
    await api.post('/notifications/read-all')
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}

export async function deleteNotification(id: string): Promise<{ error?: string }> {
  try {
    await api.delete(`/notifications/${id}`)
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}
