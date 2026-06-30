import type { SportId } from '@/lib/constants'

export type Role = 'admin' | 'organizer' | 'participant'
export type MemberType = 'monthly' | 'regular' | 'guest'
export type MemberStatus = 'pending' | 'active' | 'suspended' | 'banned'
export type ParticipantStatus = 'confirmed' | 'pending' | 'declined' | 'absent' | 'present' | 'waitlist'
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'cancelled' | 'refunded'
export type EventStatus = 'draft' | 'published' | 'open' | 'completed' | 'cancelled'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional'

export interface User {
  id: string
  name: string
  nickname: string
  avatar_url?: string
  city?: string
  bio?: string
  sports: SportId[]
  skill_level: SkillLevel
  created_at: string
}

export interface Group {
  id: string
  name: string
  slug: string
  description?: string
  sport: SportId
  cover_url?: string
  admin_id: string
  access_type: 'public' | 'private' | 'invite'
  max_members: number
  monthly_fee?: number
  per_event_fee?: number
  payment_day?: number
  pix_key?: string
  plan: 'free' | 'starter' | 'pro' | 'business'
  created_at: string
  // computed
  member_count?: number
  my_role?: Role
  my_member_type?: MemberType
}

export interface Event {
  id: string
  group_id: string
  title: string
  description?: string
  sport: SportId
  starts_at: string
  ends_at: string
  location_name?: string
  location_address?: string
  max_participants: number
  monthly_slots: number
  participant_count: number
  status: EventStatus
  is_recurring: boolean
  recurrence_rule?: string
  monthly_confirm_deadline?: string
  event_fee?: number
  notes?: string
  created_at: string
  // computed
  my_status?: ParticipantStatus
  waitlist_position?: number
}

export interface EventParticipant {
  id: string
  event_id: string
  user_id: string
  user: Pick<User, 'id' | 'name' | 'nickname' | 'avatar_url'>
  status: ParticipantStatus
  is_monthly: boolean
  confirmed_at?: string
  goals: number
  assists: number
  payment_status?: PaymentStatus
}

export interface WaitlistEntry {
  id: string
  event_id: string
  user_id: string
  user: Pick<User, 'id' | 'name' | 'nickname' | 'avatar_url'>
  position: number
  status: 'waiting' | 'notified' | 'confirmed' | 'expired' | 'left'
  is_monthly: boolean
  joined_at: string
  expires_at?: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  user: User
  role: Role
  member_type: MemberType
  status: MemberStatus
  monthly_slot: boolean
  payment_status: PaymentStatus
  skill_rating: number
  joined_at: string
}

export interface Payment {
  id: string
  group_id: string
  user_id: string
  user: Pick<User, 'id' | 'name' | 'nickname'>
  event_id?: string
  type: 'monthly' | 'per_event' | 'partial' | 'fine'
  amount: number
  status: PaymentStatus
  due_date: string
  paid_at?: string
  reference_month?: string
  notes?: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  data: Record<string, string>
  is_read: boolean
  created_at: string
}
