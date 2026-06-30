import type { User, Group, Event, EventParticipant, WaitlistEntry, GroupMember, Payment, Notification } from '@/types/app.types'

export const MOCK_ME: User = {
  id: 'user-matheus',
  name: 'Matheus Wirino',
  nickname: 'Matheus',
  city: 'São Luís, MA',
  sports: ['football', 'volleyball'],
  skill_level: 'advanced',
  created_at: '2025-01-15T10:00:00Z',
}

export const MOCK_USERS: User[] = [
  MOCK_ME,
  { id: 'user-joao',    name: 'João Silva',     nickname: 'João',    city: 'São Luís, MA', sports: ['football'], skill_level: 'advanced',     created_at: '2025-01-20T10:00:00Z' },
  { id: 'user-carlos',  name: 'Carlos Mendes',  nickname: 'Carlos',  city: 'São Luís, MA', sports: ['football'], skill_level: 'intermediate', created_at: '2025-02-01T10:00:00Z' },
  { id: 'user-pedro',   name: 'Pedro Costa',    nickname: 'Pedro',   city: 'São Luís, MA', sports: ['football'], skill_level: 'advanced',     created_at: '2025-02-10T10:00:00Z' },
  { id: 'user-lucas',   name: 'Lucas Ferreira', nickname: 'Lucas',   city: 'São Luís, MA', sports: ['football'], skill_level: 'beginner',     created_at: '2025-02-15T10:00:00Z' },
  { id: 'user-rafael',  name: 'Rafael Lima',    nickname: 'Rafael',  city: 'São Luís, MA', sports: ['football'], skill_level: 'intermediate', created_at: '2025-03-01T10:00:00Z' },
  { id: 'user-felipe',  name: 'Felipe Rocha',   nickname: 'Felipe',  city: 'São Luís, MA', sports: ['football'], skill_level: 'advanced',     created_at: '2025-03-05T10:00:00Z' },
  { id: 'user-gabriel', name: 'Gabriel Souza',  nickname: 'Gabriel', city: 'São Luís, MA', sports: ['football'], skill_level: 'intermediate', created_at: '2025-03-10T10:00:00Z' },
  { id: 'user-bruno',   name: 'Bruno Alves',    nickname: 'Bruno',   city: 'São Luís, MA', sports: ['football'], skill_level: 'beginner',     created_at: '2025-04-01T10:00:00Z' },
  { id: 'user-diego',   name: 'Diego Martins',  nickname: 'Diego',   city: 'São Luís, MA', sports: ['football'], skill_level: 'professional', created_at: '2025-04-05T10:00:00Z' },
  { id: 'user-andre',   name: 'André Santos',   nickname: 'André',   city: 'São Luís, MA', sports: ['football'], skill_level: 'intermediate', created_at: '2025-05-01T10:00:00Z' },
  { id: 'user-thiago',  name: 'Thiago Nunes',   nickname: 'Thiago',  city: 'São Luís, MA', sports: ['football'], skill_level: 'beginner',     created_at: '2025-05-10T10:00:00Z' },
  { id: 'user-marcelo', name: 'Marcelo Pires',  nickname: 'Marcelo', city: 'São Luís, MA', sports: ['football'], skill_level: 'intermediate', created_at: '2025-05-15T10:00:00Z' },
]

export const MOCK_GROUPS: Group[] = [
  {
    id: 'group-futebol',
    name: 'Futebol Quinta São Luís',
    slug: 'futebol-quinta-sao-luis',
    description: 'Pelada toda quinta! Racha animado no campo sintético.',
    sport: 'football',
    admin_id: 'user-matheus',
    access_type: 'invite',
    max_members: 20,
    monthly_fee: 60,
    per_event_fee: 15,
    payment_day: 5,
    pix_key: '98999990000',
    plan: 'pro',
    created_at: '2025-01-15T10:00:00Z',
    member_count: 10,
    my_role: 'admin',
    my_member_type: 'monthly',
  },
  {
    id: 'group-volei',
    name: 'Vôlei Arena Calhau',
    slug: 'volei-arena-calhau',
    description: 'Vôlei toda semana na Arena Calhau.',
    sport: 'volleyball',
    admin_id: 'user-joao',
    access_type: 'public',
    max_members: 24,
    monthly_fee: 50,
    per_event_fee: 12,
    payment_day: 5,
    plan: 'starter',
    created_at: '2025-02-01T10:00:00Z',
    member_count: 18,
    my_role: 'participant',
    my_member_type: 'monthly',
  },
  {
    id: 'group-beach',
    name: 'Beach Tennis Weekend',
    slug: 'beach-tennis-weekend',
    sport: 'beach',
    admin_id: 'user-carlos',
    access_type: 'invite',
    max_members: 12,
    per_event_fee: 20,
    plan: 'free',
    created_at: '2025-03-01T10:00:00Z',
    member_count: 8,
    my_role: 'participant',
    my_member_type: 'regular',
  },
]

const nextThursday = (() => {
  const d = new Date()
  d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7 || 7))
  d.setHours(20, 0, 0, 0)
  return d.toISOString()
})()

const nextThursdayEnd = (() => {
  const d = new Date(nextThursday)
  d.setHours(21, 30, 0, 0)
  return d.toISOString()
})()

const nextSaturday = (() => {
  const d = new Date()
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7))
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
})()

export const MOCK_EVENTS: Event[] = [
  {
    id: 'event-1',
    group_id: 'group-futebol',
    title: 'Futebol Quinta São Luís',
    sport: 'football',
    starts_at: nextThursday,
    ends_at: nextThursdayEnd,
    location_name: 'Campo São Luís FC',
    location_address: 'Rua das Palmeiras, 100',
    max_participants: 14,
    monthly_slots: 8,
    participant_count: 10,
    status: 'published',
    is_recurring: true,
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=TH',
    notes: 'Levar colete! Time A = verde, Time B = laranja.',
    created_at: new Date().toISOString(),
    my_status: 'confirmed',
  },
  {
    id: 'event-2',
    group_id: 'group-volei',
    title: 'Vôlei Arena Calhau',
    sport: 'volleyball',
    starts_at: nextSaturday,
    ends_at: (() => { const d = new Date(nextSaturday); d.setHours(11,0,0,0); return d.toISOString() })(),
    location_name: 'Arena Calhau',
    max_participants: 12,
    monthly_slots: 10,
    participant_count: 7,
    status: 'published',
    is_recurring: true,
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=SA',
    created_at: new Date().toISOString(),
    my_status: 'pending',
  },
  {
    id: 'event-3',
    group_id: 'group-futebol',
    title: 'Futebol Quinta São Luís',
    sport: 'football',
    starts_at: (() => { const d = new Date(nextThursday); d.setDate(d.getDate()+7); return d.toISOString() })(),
    ends_at: (() => { const d = new Date(nextThursdayEnd); d.setDate(d.getDate()+7); return d.toISOString() })(),
    location_name: 'Campo São Luís FC',
    location_address: 'Rua das Palmeiras, 100',
    max_participants: 14,
    monthly_slots: 8,
    participant_count: 3,
    status: 'published',
    is_recurring: true,
    created_at: new Date().toISOString(),
    my_status: 'pending',
  },
]

export const MOCK_PARTICIPANTS: EventParticipant[] = [
  { id: 'ep-1',  event_id: 'event-1', user_id: 'user-matheus', user: MOCK_USERS[0],  status: 'confirmed', is_monthly: true,  confirmed_at: new Date().toISOString(), goals: 0, assists: 0, payment_status: 'paid' },
  { id: 'ep-2',  event_id: 'event-1', user_id: 'user-joao',    user: MOCK_USERS[1],  status: 'confirmed', is_monthly: true,  confirmed_at: new Date().toISOString(), goals: 0, assists: 0, payment_status: 'paid' },
  { id: 'ep-3',  event_id: 'event-1', user_id: 'user-carlos',  user: MOCK_USERS[2],  status: 'confirmed', is_monthly: true,  confirmed_at: new Date().toISOString(), goals: 0, assists: 0, payment_status: 'paid' },
  { id: 'ep-4',  event_id: 'event-1', user_id: 'user-pedro',   user: MOCK_USERS[3],  status: 'confirmed', is_monthly: true,  confirmed_at: new Date().toISOString(), goals: 0, assists: 0, payment_status: 'paid' },
  { id: 'ep-5',  event_id: 'event-1', user_id: 'user-lucas',   user: MOCK_USERS[4],  status: 'confirmed', is_monthly: true,  confirmed_at: new Date().toISOString(), goals: 0, assists: 0, payment_status: 'overdue' },
  { id: 'ep-6',  event_id: 'event-1', user_id: 'user-rafael',  user: MOCK_USERS[5],  status: 'confirmed', is_monthly: true,  confirmed_at: new Date().toISOString(), goals: 0, assists: 0, payment_status: 'paid' },
  { id: 'ep-7',  event_id: 'event-1', user_id: 'user-felipe',  user: MOCK_USERS[6],  status: 'confirmed', is_monthly: true,  confirmed_at: new Date().toISOString(), goals: 0, assists: 0, payment_status: 'paid' },
  { id: 'ep-8',  event_id: 'event-1', user_id: 'user-gabriel', user: MOCK_USERS[7],  status: 'confirmed', is_monthly: true,  confirmed_at: new Date().toISOString(), goals: 0, assists: 0, payment_status: 'paid' },
  { id: 'ep-9',  event_id: 'event-1', user_id: 'user-bruno',   user: MOCK_USERS[8],  status: 'confirmed', is_monthly: false, confirmed_at: new Date().toISOString(), goals: 0, assists: 0, payment_status: 'paid' },
  { id: 'ep-10', event_id: 'event-1', user_id: 'user-diego',   user: MOCK_USERS[9],  status: 'confirmed', is_monthly: false, confirmed_at: new Date().toISOString(), goals: 0, assists: 0, payment_status: 'pending' },
  { id: 'ep-11', event_id: 'event-1', user_id: 'user-rafael',  user: MOCK_USERS[5],  status: 'declined',  is_monthly: false, goals: 0, assists: 0 },
]

export const MOCK_WAITLIST: WaitlistEntry[] = [
  { id: 'wl-1', event_id: 'event-1', user_id: 'user-andre',   user: MOCK_USERS[10], position: 1, status: 'waiting', is_monthly: false, joined_at: new Date(Date.now() - 2*3600000).toISOString() },
  { id: 'wl-2', event_id: 'event-1', user_id: 'user-thiago',  user: MOCK_USERS[11], position: 2, status: 'waiting', is_monthly: false, joined_at: new Date(Date.now() - 1*3600000).toISOString() },
  { id: 'wl-3', event_id: 'event-1', user_id: 'user-marcelo', user: MOCK_USERS[12], position: 3, status: 'waiting', is_monthly: false, joined_at: new Date(Date.now() - 0.5*3600000).toISOString() },
]

export const MOCK_MEMBERS: GroupMember[] = MOCK_USERS.slice(0, 10).map((u, i) => ({
  id: `member-${i}`,
  group_id: 'group-futebol',
  user_id: u.id,
  user: u,
  role: i === 0 ? 'admin' : i === 1 ? 'organizer' : 'participant',
  member_type: i < 8 ? 'monthly' : 'regular',
  status: 'active',
  monthly_slot: i < 8,
  payment_status: i === 4 ? 'overdue' : 'paid',
  skill_rating: [5,4,3,4,2,3,4,3,2,5][i],
  joined_at: u.created_at,
}))

export const MOCK_PAYMENTS: Payment[] = [
  { id: 'pay-1', group_id: 'group-futebol', user_id: 'user-matheus', user: { id: 'user-matheus', name: 'Matheus Wirino', nickname: 'Matheus' }, type: 'monthly', amount: 60, status: 'paid',    due_date: '2025-07-05', paid_at: '2025-07-02T10:00:00Z', reference_month: '2025-07-01' },
  { id: 'pay-2', group_id: 'group-futebol', user_id: 'user-joao',    user: { id: 'user-joao',    name: 'João Silva',     nickname: 'João'    }, type: 'monthly', amount: 60, status: 'paid',    due_date: '2025-07-05', paid_at: '2025-07-03T09:00:00Z', reference_month: '2025-07-01' },
  { id: 'pay-3', group_id: 'group-futebol', user_id: 'user-lucas',   user: { id: 'user-lucas',   name: 'Lucas Ferreira', nickname: 'Lucas'   }, type: 'monthly', amount: 60, status: 'overdue', due_date: '2025-07-05', reference_month: '2025-07-01' },
  { id: 'pay-4', group_id: 'group-futebol', user_id: 'user-bruno',   user: { id: 'user-bruno',   name: 'Bruno Alves',    nickname: 'Bruno'   }, type: 'per_event', amount: 15, status: 'paid', due_date: '2025-07-03', paid_at: '2025-07-03T20:30:00Z' },
]

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'notif-1', user_id: 'user-matheus', type: 'waitlist_called',  title: '🎉 Vaga disponível!',          body: 'Uma vaga abriu no Futebol Quinta! Você tem 30 minutos para confirmar.',  data: { groupId: 'group-futebol', eventId: 'event-1' }, is_read: false, created_at: new Date(Date.now() - 10*60000).toISOString() },
  { id: 'notif-2', user_id: 'user-matheus', type: 'payment_received', title: '✅ Pagamento confirmado',       body: 'Seu pagamento de R$ 60,00 foi confirmado. Mensalidade julho quitada!',    data: { groupId: 'group-futebol' },                       is_read: false, created_at: new Date(Date.now() - 2*3600000).toISOString() },
  { id: 'notif-3', user_id: 'user-matheus', type: 'member_joined',    title: '👋 Novo membro',               body: 'Bruno entrou no grupo Futebol Quinta São Luís.',                         data: { groupId: 'group-futebol' },                       is_read: true,  created_at: new Date(Date.now() - 24*3600000).toISOString() },
]

export const MOCK_RANKING = MOCK_MEMBERS.map((m, i) => ({
  user: m.user,
  presences: [12, 11, 10, 9, 9, 8, 7, 6, 5, 4][i],
  goals: [8, 3, 6, 2, 0, 4, 1, 0, 2, 3][i],
  assists: [5, 7, 2, 4, 3, 1, 6, 3, 0, 2][i],
  position: i + 1,
  trend: (['up', 'up', 'same', 'down', 'same', 'up', 'down', 'down', 'up', 'down'] as const)[i],
}))
