export const SPORTS = [
  { id: 'football', label: 'Futebol', emoji: '⚽' },
  { id: 'futsal', label: 'Futsal', emoji: '🥅' },
  { id: 'volleyball', label: 'Vôlei', emoji: '🏐' },
  { id: 'beach', label: 'Beach Tennis', emoji: '🏖️' },
  { id: 'tennis', label: 'Tênis', emoji: '🎾' },
  { id: 'basketball', label: 'Basquete', emoji: '🏀' },
  { id: 'kart', label: 'Kart', emoji: '🏎️' },
  { id: 'cycling', label: 'Ciclismo', emoji: '🚴' },
  { id: 'running', label: 'Corrida', emoji: '🏃' },
  { id: 'bbq', label: 'Churrasco', emoji: '🍖' },
  { id: 'other', label: 'Outros', emoji: '🎯' },
] as const

export type SportId = (typeof SPORTS)[number]['id']

export const SPORT_MAP = Object.fromEntries(SPORTS.map((s) => [s.id, s])) as Record<
  SportId,
  (typeof SPORTS)[number]
>
