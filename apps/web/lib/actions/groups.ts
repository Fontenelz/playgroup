'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface CreateGroupInput {
  sport: string
  name: string
  description: string
  accessType: 'public' | 'invite' | 'private'
  maxMembers: number
  monthlyFee: string
  perEventFee: string
  paymentDay: string
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

export async function createGroup(input: CreateGroupInput) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Não autenticado' }

  const baseSlug = slugify(input.name) || 'grupo'
  // Garante slug único adicionando sufixo randômico
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`

  const monthlyFee  = parseFloat(input.monthlyFee)  || null
  const perEventFee = parseFloat(input.perEventFee) || null
  const paymentDay  = parseInt(input.paymentDay)    || null

  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      name:          input.name,
      slug,
      description:   input.description || null,
      sport:         input.sport,
      admin_id:      user.id,
      access_type:   input.accessType,
      max_members:   input.maxMembers,
      monthly_fee:   monthlyFee,
      per_event_fee: perEventFee,
      payment_day:   paymentDay,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Insere criador como admin na tabela de membros
  await supabase.from('group_members').insert({
    group_id:    group.id,
    user_id:     user.id,
    role:        'admin',
    member_type: 'monthly',
    status:      'active',
  })

  redirect(`/groups/${group.id}`)
}

export async function createInviteCode(groupId: string): Promise<{ code?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Reuse existing permanent code created by this user
  const { data: existing } = await supabase
    .from('invite_codes')
    .select('code')
    .eq('group_id', groupId)
    .eq('created_by', user.id)
    .is('expires_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return { code: existing.code }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

  const { error } = await supabase.from('invite_codes').insert({
    group_id: groupId,
    code,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  return { code }
}

export async function joinGroup(code: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: groupId, error } = await supabase.rpc('redeem_invite', { p_code: code })

  if (error) return { error: error.message }

  redirect(`/groups/${groupId}`)
}
