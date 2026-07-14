export { SPORTS, SPORT_MAP } from '@playgroup/types'
export type { SportId } from '@playgroup/types'

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
