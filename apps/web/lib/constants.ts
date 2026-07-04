export const SPORTS = [
  { id: 'football',    label: 'Futebol',       emoji: '⚽' },
  { id: 'futsal',      label: 'Futsal',         emoji: '🥅' },
  { id: 'volleyball',  label: 'Vôlei',          emoji: '🏐' },
  { id: 'beach',       label: 'Beach Tennis',   emoji: '🏖️' },
  { id: 'tennis',      label: 'Tênis',          emoji: '🎾' },
  { id: 'basketball',  label: 'Basquete',       emoji: '🏀' },
  { id: 'kart',        label: 'Kart',           emoji: '🏎️' },
  { id: 'cycling',     label: 'Ciclismo',       emoji: '🚴' },
  { id: 'running',     label: 'Corrida',        emoji: '🏃' },
  { id: 'bbq',         label: 'Churrasco',      emoji: '🍖' },
  { id: 'other',       label: 'Outros',         emoji: '🎯' },
] as const

export type SportId = typeof SPORTS[number]['id']

export const SPORT_MAP = Object.fromEntries(
  SPORTS.map((s) => [s.id, s])
) as Record<SportId, typeof SPORTS[number]>

export const ROLES = {
  admin:       'Administrador',
  organizer:   'Organizador',
  participant: 'Participante',
} as const

export const PARTICIPANT_STATUS = {
  confirmed: { label: 'Confirmado',  color: 'success' },
  pending:   { label: 'Pendente',    color: 'warning' },
  declined:  { label: 'Recusou',     color: 'error'   },
  waitlist:  { label: 'Fila',        color: 'info'    },
  absent:    { label: 'Ausente',     color: 'error'   },
  present:   { label: 'Presente',    color: 'success' },
} as const

export const PAYMENT_STATUS = {
  paid:      { label: 'Pago',       color: 'success' },
  pending:   { label: 'Pendente',   color: 'warning' },
  overdue:   { label: 'Atrasado',   color: 'error'   },
  cancelled: { label: 'Cancelado',  color: 'neutral' },
} as const

export const ONBOARDING_STEPS = [
  'welcome',
  'profile',
  'photo',
  'sports',
  'start',
] as const
