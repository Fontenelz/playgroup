'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Settings, LogOut, ChevronRight, Pencil } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SportIcon } from '@/components/shared/SportIcon'
import { useAuthStore } from '@/store/auth.store'
import { MOCK_ME, MOCK_GROUPS, MOCK_RANKING } from '@/data/mock'
import { SPORT_MAP } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const router = useRouter()
  const storeUser = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const user = storeUser ?? MOCK_ME

  const myRanking = MOCK_RANKING[0]
  const stats = [
    { label: 'Presenças',   value: myRanking.presences },
    { label: 'Confirmação', value: '94%' },
    { label: 'Grupos',      value: MOCK_GROUPS.length },
  ]

  function handleLogout() {
    logout()
    toast('Até logo!', { icon: '👋' })
    router.push('/login')
  }

  return (
    <div>
      <Header
        title="Meu Perfil"
        rightAction={
          <Link href="/profile/edit" className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400">
            <Pencil className="size-4" />
          </Link>
        }
      />

      <div className="px-4 py-6 space-y-6">
        {/* Avatar + info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <Avatar name={user.name} src={user.avatar_url} size="xl" />
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-100">{user.name}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{user.city}</p>
            <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
              {user.sports.map((s) => (
                <Badge key={s} variant="primary" size="sm">
                  {SPORT_MAP[s]?.emoji} {SPORT_MAP[s]?.label}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-slate-100">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Conquistas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conquistas</h3>
          {[
            { emoji: '⭐', label: '6 meses seguidos', done: true },
            { emoji: '💰', label: 'Sem atraso em 2025', done: true },
            { emoji: '🏆', label: '50 presenças', done: false, progress: `${myRanking.presences}/50` },
          ].map(({ emoji, label, done, progress }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={done ? '' : 'grayscale opacity-50'}>{emoji}</span>
              <span className={`text-sm flex-1 ${done ? 'text-slate-200' : 'text-slate-500'}`}>{label}</span>
              {progress && <span className="text-xs text-slate-500">{progress}</span>}
              {done && <span className="text-xs text-primary-400">✓</span>}
            </div>
          ))}
        </div>

        {/* Meus grupos */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meus grupos</h3>
          {MOCK_GROUPS.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-all">
                <SportIcon sport={group.sport} size="sm" />
                <p className="flex-1 text-sm text-slate-200">{group.name}</p>
                <ChevronRight className="size-4 text-slate-600" />
              </div>
            </Link>
          ))}
        </div>

        {/* Logout */}
        <Button variant="danger" fullWidth onClick={handleLogout} leftIcon={<LogOut className="size-4" />}>
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
