'use client'

import { create } from 'zustand'
import type { User } from '@/types/app.types'

interface AuthState {
  user: User | null
  isLoading: boolean
  // Derivados — mantidos para compatibilidade com páginas existentes
  isAuthenticated: boolean
  onboardingComplete: boolean
  // Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  // Compat — usadas no onboarding e em páginas legadas
  updateUser: (data: Partial<User>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  onboardingComplete: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      onboardingComplete: !!user,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  updateUser: (data) =>
    set((s) => ({
      user: s.user ? { ...s.user, ...data } : s.user,
    })),
}))
