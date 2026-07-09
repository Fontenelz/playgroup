'use server'

import { api, ApiError } from '@/lib/api/client'

export async function markPaymentPaid(paymentId: string): Promise<{ error?: string }> {
  try {
    await api.post(`/payments/${paymentId}/mark-paid`)
    return {}
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    throw err
  }
}
