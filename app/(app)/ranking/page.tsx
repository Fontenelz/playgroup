'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { MOCK_RANKING } from '@/data/mock'

type Tab = 'presences' | 'goals' | 'assists'

const tabs: { id: Tab; label: string }[] = [
  { id: 'presences', label: 'Presenças' },
  { id: 'goals',     label: 'Gols' },
  { id: 'assists',   label: 'Assistências' },
]

export default function RankingPage() {
  const [tab, setTab] = useState<Tab>('presences')

  const sorted = [...MOCK_RANKING].sort((a, b) => {
    if (tab === 'presences') return b.presences - a.presences
    if (tab === 'goals')     return b.goals - a.goals
    return b.assists - a.assists
  })

  return (
    <div>
      <Header title="Ranking" />

      <div className="px-4 py-4 space-y-4">
        {/* Group selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
          <div className="size-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-base">⚽</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-100">Futebol Quinta São Luís</p>
            <p className="text-xs text-slate-500">Julho 2025</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                tab === id
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                  : 'text-slate-400 hover:text-slate-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Top 3 podium */}
        <div className="flex items-end justify-center gap-3 py-4">
          {[sorted[1], sorted[0], sorted[2]].map((entry, podiumPos) => {
            if (!entry) return <div key={podiumPos} className="w-24" />
            const heights = ['h-20', 'h-28', 'h-16']
            const medals = ['🥈', '🥇', '🥉']
            const positions = [2, 1, 3]
            return (
              <motion.div
                key={entry.user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: podiumPos * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-xl">{medals[podiumPos]}</span>
                <Avatar name={entry.user.name} src={entry.user.avatar_url} size="md" />
                <p className="text-xs font-semibold text-slate-200">{entry.user.nickname}</p>
                <div className={cn('w-20 bg-slate-800 border border-slate-700 rounded-t-xl flex items-center justify-center', heights[podiumPos])}>
                  <span className="text-lg font-bold text-slate-100">
                    {tab === 'presences' ? entry.presences : tab === 'goals' ? entry.goals : entry.assists}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Full ranking */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {sorted.map((entry, i) => {
            const value = tab === 'presences' ? entry.presences : tab === 'goals' ? entry.goals : entry.assists
            const isMe = entry.user.id === 'user-matheus'

            return (
              <motion.div
                key={entry.user.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  i > 0 && 'border-t border-slate-800',
                  isMe && 'bg-primary-500/5',
                )}
              >
                <span className={cn('w-6 text-sm font-bold text-center', i < 3 ? 'text-amber-400' : 'text-slate-500')}>
                  {i + 1}
                </span>
                <Avatar name={entry.user.name} src={entry.user.avatar_url} size="sm" />
                <p className={cn('flex-1 text-sm font-medium', isMe ? 'text-primary-300' : 'text-slate-200')}>
                  {entry.user.nickname} {isMe && '(você)'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-100">{value}</span>
                  {entry.trend === 'up'   && <TrendingUp  className="size-3.5 text-emerald-400" />}
                  {entry.trend === 'down' && <TrendingDown className="size-3.5 text-red-400" />}
                  {entry.trend === 'same' && <Minus        className="size-3.5 text-slate-500" />}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
