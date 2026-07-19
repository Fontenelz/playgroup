import { describe, expect, it } from 'vitest'
import { balancedDraw, type DrawPlayer, randomDraw, SKILL_SCORE } from './draw'

function makePlayers(skills: DrawPlayer['skill'][]): DrawPlayer[] {
  return skills.map((skill, i) => ({
    userId: `user-${i}`,
    name: `Jogador ${i}`,
    nickname: `J${i}`,
    skill,
    teamIndex: null,
  }))
}

describe('balancedDraw', () => {
  it('atribui todo mundo a um time válido (0..numTeams-1)', () => {
    const players = makePlayers([
      'professional',
      'advanced',
      'advanced',
      'intermediate',
      'intermediate',
      'beginner',
      'beginner',
      'beginner',
    ])
    const result = balancedDraw(players, 2)

    expect(result).toHaveLength(players.length)
    for (const p of result) {
      expect(p.teamIndex).toBeGreaterThanOrEqual(0)
      expect(p.teamIndex).toBeLessThan(2)
    }
  })

  it('não perde nem duplica jogadores', () => {
    const players = makePlayers(['professional', 'beginner', 'advanced', 'intermediate', 'beginner'])
    const result = balancedDraw(players, 3)

    expect(result.map((p) => p.userId).sort()).toEqual(players.map((p) => p.userId).sort())
  })

  it('distribui o nível de forma equilibrada entre os times', () => {
    // 4 profissionais + 4 iniciantes, 2 times — o balanceamento greedy por
    // maior nível primeiro deve intercalar em vez de empilhar tudo num time só.
    const players = makePlayers([
      'professional',
      'professional',
      'professional',
      'professional',
      'beginner',
      'beginner',
      'beginner',
      'beginner',
    ])
    const result = balancedDraw(players, 2)

    const scoreByTeam = [0, 1].map((teamIdx) =>
      result
        .filter((p) => p.teamIndex === teamIdx)
        .reduce((sum, p) => sum + SKILL_SCORE[p.skill], 0),
    )

    expect(scoreByTeam[0]).toBe(scoreByTeam[1])
  })

  it('com times vazios (0 jogadores) retorna lista vazia', () => {
    expect(balancedDraw([], 2)).toEqual([])
  })
})

describe('randomDraw', () => {
  it('atribui todo mundo a um time válido e não perde jogadores', () => {
    const players = makePlayers(['beginner', 'intermediate', 'advanced', 'professional', 'beginner'])
    const result = randomDraw(players, 3)

    expect(result.map((p) => p.userId).sort()).toEqual(players.map((p) => p.userId).sort())
    for (const p of result) {
      expect(p.teamIndex).toBeGreaterThanOrEqual(0)
      expect(p.teamIndex).toBeLessThan(3)
    }
  })
})
