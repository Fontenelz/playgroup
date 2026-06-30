'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

export default function RootPage() {
  const router = useRouter()
  const { isAuthenticated, onboardingComplete } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
    } else if (!onboardingComplete) {
      router.replace('/onboarding')
    } else {
      router.replace('/home')
    }
  }, [isAuthenticated, onboardingComplete, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="size-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
