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

/** Fisher–Yates — sort(() => Math.random() - 0.5) é um shuffle enviesado e
 *  dependente da implementação de sort do engine, não uniforme de verdade. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function randomDraw(players: DrawPlayer[], numTeams: number): DrawPlayer[] {
  const shuffled = shuffle(players)
  return shuffled.map((p, i) => ({ ...p, teamIndex: i % numTeams }))
}
