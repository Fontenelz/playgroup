import type { SkillLevel } from '@/types/app.types'

export const SKILL_SCORE: Record<SkillLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  professional: 4,
}

export interface DrawPlayer {
  userId: string
  name: string
  nickname: string
  avatarUrl?: string | null
  skill: SkillLevel
  teamIndex: number | null
}

/** Ordena por nível (desc) e distribui greedy pro time com menor soma de skill. */
export function balancedDraw(players: DrawPlayer[], numTeams: number): DrawPlayer[] {
  const sorted = [...players].sort((a, b) => SKILL_SCORE[b.skill] - SKILL_SCORE[a.skill])
  const scores = Array(numTeams).fill(0) as number[]
  return sorted.map((p, i) => {
    const teamIdx = i < numTeams ? i : scores.indexOf(Math.min(...scores))
    scores[teamIdx] += SKILL_SCORE[p.skill]
    return { ...p, teamIndex: teamIdx }
  })
}

export function randomDraw(players: DrawPlayer[], numTeams: number): DrawPlayer[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5)
  return shuffled.map((p, i) => ({ ...p, teamIndex: i % numTeams }))
}
