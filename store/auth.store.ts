'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types/app.types'
import type { SportId } from '@/lib/constants'

interface OnboardingData {
  name: string
  nickname: string
  city: string
  sports: SportId[]
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  onboardingComplete: boolean
  onboardingData: Partial<OnboardingData>
  login: (method: 'google' | 'apple' | 'email') => void
  logout: () => void
  completeOnboarding: (data: OnboardingData) => void
  updateOnboardingData: (data: Partial<OnboardingData>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      onboardingComplete: false,
      onboardingData: {},

      login: (_method: 'google' | 'apple' | 'email') => {
        set({ isAuthenticated: true, user: null })
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, onboardingComplete: false, onboardingData: {} })
      },

      completeOnboarding: (data: OnboardingData) => {
        const user: User = {
          id: `user-${Date.now()}`,
          name: data.name,
          nickname: data.nickname,
          city: data.city,
          sports: data.sports,
          skill_level: 'intermediate',
          created_at: new Date().toISOString(),
        }
        set({ user, onboardingComplete: true, onboardingData: {} })
      },

      updateOnboardingData: (data: Partial<OnboardingData>) => {
        set((s: AuthState) => ({ onboardingData: { ...s.onboardingData, ...data } }))
      },
    }),
    {
      name: 'playgroup-auth',
      storage: createJSONStorage(() => localStorage),
      partializer: (state: AuthState) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        onboardingComplete: state.onboardingComplete,
      }),
    } as Parameters<typeof persist<AuthState>>[1]
  )
)
