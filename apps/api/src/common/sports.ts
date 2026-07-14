import { SPORTS } from '@playgroup/types'

export const SPORT_LABELS: Record<string, string> = Object.fromEntries(
  SPORTS.map((s) => [s.id, s.label]),
)
