'use client'

import { use, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Shuffle, RefreshCw, Users, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { SelectCardGroup } from '@/components/ui/SelectCard'
import { MOCK_EVENTS, MOCK_PARTICIPANTS, MOCK_GROUPS, MOCK_USERS } from '@/data/mock'
import { cn } from '@/lib/utils'
import type { SkillLevel } from '@/types/app.types'

type DrawMethod = 'random' | 'balanced'
type TeamCount = '2' | '3' | '4'

const SKILL_SCORE: Record<SkillLevel, number> = {
  beginner:     1,
  intermediate: 2,
  advanced:     3,
  professional: 4,
}

const TEAM_COLORS = [
  { bg: 'bg-emerald-500', ring: 'ring-emerald-500', text: 'text-emerald-400', light: 'bg-emerald-500/15', name: 'Time Verde' },
  { bg: 'bg-amber-500',   ring: 'ring-amber-500',   text: 'text-amber-400',   light: 'bg-amber-500/15',   name: 'Time Laranja' },
  { bg: 'bg-sky-500',     ring: 'ring-sky-500',     text: 'text-sky-400',     light: 'bg-sky-500/15',     name: 'Time Azul' },
  { bg: 'bg-rose-500',    ring: 'ring-rose-500',    text: 'text-rose-400',    light: 'bg-rose-500/15',    name: 'Time Vermelho' },
]

interface Player {
  userId: string
  name: string
  nickname: string
  avatarUrl?: string
  skill: SkillLevel
  teamIndex: number | null
}

function balancedDraw(players: Player[], numTeams: number): Player[] {
  const sorted = [...players].sort((a, b) => SKILL_SCORE[b.skill] - SKILL_SCORE[a.skill])
  const scores = Array(numTeams).fill(0)
  return sorted.map((p, i) => {
    const teamIdx = i < numTeams
      ? i
      : scores.indexOf(Math.min(...scores))
    scores[teamIdx] += SKILL_SCORE[p.skill]
    return { ...p, teamIndex: teamIdx }
  })
}

function randomDraw(players: Player[], numTeams: number): Player[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5)
  return shuffled.map((p, i) => ({ ...p, teamIndex: i % numTeams }))
}

export default function SortearPage({
  params,
}: {
  params: Promise<{ groupId: string; eventId: string }>
}) {
  const { groupId, eventId } = use(params)
  const router = useRouter()

  const event = MOCK_EVENTS.find((e) => e.id === eventId) ?? MOCK_EVENTS[0]

  // Build player pool from confirmed participants
  const initialPlayers: Player[] = MOCK_PARTICIPANTS
    .filter((p) => (p.event_id === eventId || eventId === 'event-1') && p.status === 'confirmed')
    .map((p) => {
      const fullUser = MOCK_USERS.find((u) => u.id === p.user_id)
      return {
        userId:    p.user_id,
        name:      p.user.name,
        nickname:  p.user.nickname ?? p.user.name.split(' ')[0],
        avatarUrl: p.user.avatar_url,
        skill:     fullUser?.skill_level ?? 'intermediate',
        teamIndex: null,
      }
    })

  const [players, setPlayers]         = useState<Player[]>(initialPlayers)
  const [method, setMethod]           = useState<DrawMethod>('balanced')
  const [teamCount, setTeamCount]     = useState<TeamCount>('2')
  const [isDrawn, setIsDrawn]         = useState(false)
  const [isDrawing, setIsDrawing]     = useState(false)
  const [swapSource, setSwapSource]   = useState<string | null>(null)
  const [collapsedTeams, setCollapsedTeams] = useState<Set<number>>(new Set())

  const numTeams = parseInt(teamCount)

  const draw = useCallback(async () => {
    setIsDrawing(true)
    setIsDrawn(false)
    setSwapSource(null)

    // Animate delay
    await new Promise((r) => setTimeout(r, 900))

    const result = method === 'balanced'
      ? balancedDraw(players, numTeams)
      : randomDraw(players, numTeams)

    setPlayers(result)
    setIsDrawn(true)
    setIsDrawing(false)
  }, [players, method, numTeams])

  function redraw() {
    setPlayers((p) => p.map((x) => ({ ...x, teamIndex: null })))
    setIsDrawn(false)
    setSwapSource(null)
    setCollapsedTeams(new Set())
  }

  function handlePlayerTap(userId: string) {
    if (!isDrawn) return
    if (!swapSource) {
      setSwapSource(userId)
      return
    }
    if (swapSource === userId) {
      setSwapSource(null)
      return
    }
    // Swap teams
    setPlayers((prev) => {
      const a = prev.find((p) => p.userId === swapSource)
      const b = prev.find((p) => p.userId === userId)
      if (!a || !b || a.teamIndex === b.teamIndex) { setSwapSource(null); return prev }
      return prev.map((p) => {
        if (p.userId === swapSource) return { ...p, teamIndex: b.teamIndex }
        if (p.userId === userId)     return { ...p, teamIndex: a.teamIndex }
        return p
      })
    })
    setSwapSource(null)
  }

  function toggleCollapse(teamIdx: number) {
    setCollapsedTeams((prev) => {
      const next = new Set(prev)
      next.has(teamIdx) ? next.delete(teamIdx) : next.add(teamIdx)
      return next
    })
  }

  const teamGroups = Array.from({ length: numTeams }, (_, i) =>
    players.filter((p) => p.teamIndex === i)
  )

  const skillLabel: Record<SkillLevel, string> = {
    beginner:     '⭐',
    intermediate: '⭐⭐',
    advanced:     '⭐⭐⭐',
    professional: '⭐⭐⭐⭐',
  }

  const teamScore = (team: Player[]) =>
    team.reduce((s, p) => s + SKILL_SCORE[p.skill], 0)

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer -ml-1"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div>
            <p className="text-xs text-slate-400">Sorteio de times</p>
            <p className="text-sm font-semibold text-slate-100 truncate max-w-[220px]">{event.title}</p>
          </div>
          {isDrawn && (
            <button
              onClick={redraw}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className="size-3.5" />
              Refazer
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-6 pb-32">

        {/* ── Config (hidden after draw) ────────────────────────── */}
        <AnimatePresence>
          {!isDrawn && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="space-y-5"
            >
              {/* Player count info */}
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <div className="size-9 rounded-xl bg-primary-500/15 flex items-center justify-center">
                  <Users className="size-4 text-primary-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{players.length} jogadores confirmados</p>
                  <p className="text-xs text-slate-500">{Math.floor(players.length / numTeams)} por time · {players.length % numTeams > 0 ? `${players.length % numTeams} time(s) com +1` : 'divisão exata'}</p>
                </div>
              </div>

              {/* Number of teams */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-300">Número de times</p>
                <SelectCardGroup
                  options={[
                    { id: '2' as TeamCount, label: '2 times', description: `~${Math.ceil(players.length / 2)} jogadores cada` },
                    { id: '3' as TeamCount, label: '3 times', description: `~${Math.ceil(players.length / 3)} jogadores cada` },
                    { id: '4' as TeamCount, label: '4 times', description: `~${Math.ceil(players.length / 4)} jogadores cada` },
                  ]}
                  value={teamCount}
                  onChange={(v) => setTeamCount(v as TeamCount)}
                  columns={3}
                />
              </div>

              {/* Method */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-300">Método</p>
                <SelectCardGroup
                  options={[
                    { id: 'balanced' as DrawMethod, label: 'Equilibrado', description: 'Times com nível similar.', icon: '⚖️' },
                    { id: 'random'   as DrawMethod, label: 'Aleatório',   description: 'Sorteio puro.',            icon: '🎲' },
                  ]}
                  value={method}
                  onChange={(v) => setMethod(v as DrawMethod)}
                  columns={2}
                />
              </div>

              {/* Player pool preview */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                  <Star className="size-3.5 text-amber-400" />
                  Jogadores no sorteio
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {players.map((p) => (
                    <div key={p.userId} className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                      <Avatar name={p.name} src={p.avatarUrl} size="xs" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{p.nickname}</p>
                        <p className="text-[10px] text-slate-500">{skillLabel[p.skill]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Drawing animation ────────────────────────────────── */}
        <AnimatePresence>
          {isDrawing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center py-16 gap-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
                className="size-16 rounded-2xl bg-primary-500/20 flex items-center justify-center"
              >
                <Shuffle className="size-8 text-primary-400" />
              </motion.div>
              <div className="text-center">
                <p className="text-slate-100 font-semibold">Sorteando times...</p>
                <p className="text-sm text-slate-500 mt-1">
                  {method === 'balanced' ? 'Equilibrando por nível' : 'Embaralhando aleatoriamente'}
                </p>
              </div>
              {/* Animated player names */}
              <div className="flex gap-1 flex-wrap justify-center max-w-[260px]">
                {players.map((p, i) => (
                  <motion.span
                    key={p.userId}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.5, delay: i * 0.07, repeat: Infinity }}
                    className="text-xs text-slate-400 bg-slate-800 rounded-full px-2 py-0.5"
                  >
                    {p.nickname}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Teams result ────────────────────────────────────── */}
        <AnimatePresence>
          {isDrawn && !isDrawing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {isDrawn && (
                <p className="text-xs text-slate-500 text-center">
                  Toque em dois jogadores para trocar de time.
                </p>
              )}

              {teamGroups.map((team, i) => {
                const color = TEAM_COLORS[i % TEAM_COLORS.length]
                const collapsed = collapsedTeams.has(i)
                const score = teamScore(team)

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={cn('border rounded-2xl overflow-hidden', color.light, `border-${color.bg.split('-')[1]}-500/30`)}
                  >
                    {/* Team header */}
                    <button
                      onClick={() => toggleCollapse(i)}
                      className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer"
                    >
                      <div className={cn('size-3 rounded-full', color.bg)} />
                      <span className={cn('text-sm font-bold flex-1 text-left', color.text)}>
                        {color.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {team.length} jogadores · força {score}
                      </span>
                      {collapsed
                        ? <ChevronDown className="size-4 text-slate-500" />
                        : <ChevronUp className="size-4 text-slate-500" />
                      }
                    </button>

                    {/* Team players */}
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-1.5">
                            {team.map((p) => {
                              const isSource   = swapSource === p.userId
                              const isSwapable = !!swapSource && swapSource !== p.userId

                              return (
                                <motion.button
                                  key={p.userId}
                                  onClick={() => handlePlayerTap(p.userId)}
                                  layout
                                  className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer text-left',
                                    isSource
                                      ? 'border-white/30 bg-white/10 ring-2 ring-white/20'
                                      : isSwapable
                                      ? 'border-white/20 bg-white/5 hover:bg-white/10'
                                      : 'border-transparent bg-slate-900/50 hover:bg-slate-900/80',
                                  )}
                                >
                                  <div className={cn('size-1.5 rounded-full flex-shrink-0', color.bg)} />
                                  <Avatar name={p.name} src={p.avatarUrl} size="xs" />
                                  <span className="flex-1 text-sm font-medium text-slate-100">{p.nickname}</span>
                                  <span className="text-[11px] text-slate-500">{skillLabel[p.skill]}</span>
                                  {isSource && (
                                    <span className="text-[10px] text-white font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
                                      mover
                                    </span>
                                  )}
                                </motion.button>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer CTA ─────────────────────────────────────────────── */}
      {!isDrawn && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-4 py-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/60">
          <Button
            fullWidth
            size="lg"
            onClick={draw}
            loading={isDrawing}
            leftIcon={<Shuffle className="size-5" />}
          >
            Sortear agora
          </Button>
        </div>
      )}
    </div>
  )
}
