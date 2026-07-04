'use client'

import { motion } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

export interface RankingUser {
  id: string
  name: string
  nickname: string | null
  avatar_url: string | null
}

export interface RankingItem {
  user_id: string
  user: RankingUser
  presences: number
}

interface RankingClientProps {
  ranking: RankingItem[]
  currentUserId: string
}

export default function RankingClient({ ranking, currentUserId }: RankingClientProps) {
  const top3 = [ranking[1], ranking[0], ranking[2]] // podium order: 2nd, 1st, 3rd
  const medals = ['🥈', '🥇', '🥉']
  const heights = ['h-20', 'h-28', 'h-16']

  if (ranking.length === 0) {
    return (
      <div>
        <Header title="Ranking" />
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <p className="text-4xl mb-4">🏆</p>
          <p className="text-slate-300 font-semibold">Nenhuma presença ainda</p>
          <p className="text-sm text-slate-500 mt-1">
            As presenças nos eventos aparecerão aqui.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Ranking" />

      <div className="px-4 py-4 space-y-4">
        {/* Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
          <div className="size-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-base">🏆</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-100">Ranking geral</p>
            <p className="text-xs text-slate-500">Todos os grupos · Presenças</p>
          </div>
        </div>

        {/* Top 3 podium */}
        {ranking.length >= 2 && (
          <div className="flex items-end justify-center gap-3 py-4">
            {top3.map((entry, podiumPos) => {
              if (!entry) return <div key={podiumPos} className="w-24" />
              const nickname = entry.user.nickname ?? entry.user.name.split(' ')[0]
              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: podiumPos * 0.1 }}
                  className="flex flex-col items-center gap-2"
                >
                  <span className="text-xl">{medals[podiumPos]}</span>
                  <Avatar name={entry.user.name} src={entry.user.avatar_url ?? undefined} size="md" />
                  <p className="text-xs font-semibold text-slate-200">{nickname}</p>
                  <div className={cn('w-20 bg-slate-800 border border-slate-700 rounded-t-xl flex items-center justify-center', heights[podiumPos])}>
                    <span className="text-lg font-bold text-slate-100">{entry.presences}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Full ranking */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {ranking.map((entry, i) => {
            const isMe = entry.user_id === currentUserId
            const nickname = entry.user.nickname ?? entry.user.name.split(' ')[0]

            return (
              <motion.div
                key={entry.user_id}
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
                <Avatar name={entry.user.name} src={entry.user.avatar_url ?? undefined} size="sm" />
                <p className={cn('flex-1 text-sm font-medium', isMe ? 'text-primary-300' : 'text-slate-200')}>
                  {nickname} {isMe && <span className="text-xs text-slate-500">(você)</span>}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-100">{entry.presences}</span>
                  <span className="text-xs text-slate-500">pres.</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
