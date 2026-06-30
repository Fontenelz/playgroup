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

export async function joinGroup(code: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Find invite code
  const { data: invite } = await supabase
    .from('invite_codes')
    .select('id, group_id, expires_at, max_uses, uses')
    .eq('code', code)
    .single()

  if (!invite) return { error: 'Código de convite inválido' }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: 'Este convite expirou' }
  }

  if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
    return { error: 'Este convite atingiu o limite de usos' }
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', invite.group_id)
    .eq('user_id', user.id)
    .single()

  if (existing) return { error: 'Você já é membro deste grupo' }

  const { error: insertError } = await supabase.from('group_members').insert({
    group_id: invite.group_id,
    user_id: user.id,
    role: 'participant',
    member_type: 'regular',
    status: 'active',
  })

  if (insertError) return { error: insertError.message }

  await supabase
    .from('invite_codes')
    .update({ uses: invite.uses + 1 })
    .eq('id', invite.id)

  redirect(`/groups/${invite.group_id}`)
}
