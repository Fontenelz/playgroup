'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Bell, Home, Plus, ChevronRight, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { SportCover } from '@/components/shared/SportCover'
import type { SportId } from '@/lib/constants'
import { formatDate, formatTime, cn } from '@/lib/utils'
import { confirmParticipation, declineParticipation } from '@/lib/actions/events'
import toast from 'react-hot-toast'

export interface HomeUser {
  id: string
  name: string
  nickname: string | null
  avatar_url?: string | null
}

export interface HomeGroup {
  id: string
  name: string
  sport: string
  member_count: number
  my_role: string
}

export interface HomeEvent {
  id: string
  group_id: string | null
  sport: string
  starts_at: string
  ends_at: string
  max_participants: number
  participant_count: number
  my_status: string | null
  group_name: string | null
  visibility?: 'link_only' | 'public' | null
}

export interface HomeNotification {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, string>
  is_read: boolean
  created_at: string
}

interface HomeClientProps {
  user: HomeUser
  groups: HomeGroup[]
  events: HomeEvent[]
  notifications: HomeNotification[]
  unreadCount: number
}

export default function HomeClient({ user, groups, events, notifications, unreadCount }: HomeClientProps) {
  const [, startTransition] = useTransition()
  const [eventStatuses, setEventStatuses] = useState<Record<string, string | null>>(
    Object.fromEntries(events.map((e) => [e.id, e.my_status])),
  )

  const nickname = user.nickname ?? user.name.split(' ')[0]

  function handleConfirm(eventId: string) {
    setEventStatuses((s) => ({ ...s, [eventId]: 'confirmed' }))
    toast.success('Presença confirmada!')
    startTransition(async () => {
      const result = await confirmParticipation(eventId)
      if (result?.error) {
        setEventStatuses((s) => ({ ...s, [eventId]: null }))
        toast.error(result.error)
      }
    })
  }

  function handleDecline(eventId: string) {
    setEventStatuses((s) => ({ ...s, [eventId]: 'declined' }))
    toast('Presença recusada.', { icon: '👋' })
    startTransition(async () => {
      const result = await declineParticipation(eventId)
      if (result?.error) {
        setEventStatuses((s) => ({ ...s, [eventId]: null }))
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="pb-4">
      <ScreenHeader
        icon={<Home className="size-5" />}
        title={`Olá, ${nickname} 👋`}
        subtitle="Pronto pro próximo jogo?"
        right={
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative size-10 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors">
              <Bell className="size-5 text-slate-400" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-4 bg-primary-500 rounded-full text-[10px] font-bold text-slate-900 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link href="/profile">
              <Avatar name={user.name} src={user.avatar_url ?? undefined} size="sm" />
            </Link>
          </div>
        }
      />

      <div className="px-5 space-y-4">

      {/* Próximos eventos */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Próximos eventos</h2>
          <Link href="/groups" className="text-xs text-primary-400 font-medium">Ver todos</Link>
        </div>

        {events.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-2xl mb-2">📅</p>
            <p className="text-sm text-slate-400">Nenhum evento próximo.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event, i) => {
              const status = eventStatuses[event.id] ?? null
              const slots = event.max_participants - event.participant_count
              const date = formatDate(event.starts_at, { weekday: 'short', day: '2-digit', month: '2-digit' })
              const time = formatTime(event.starts_at)

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Link href={event.group_id ? `/groups/${event.group_id}/events/${event.id}` : `/e/${event.id}`}>
                    <Card interactive className={cn(
                      status === 'confirmed' && 'border border-primary-500/30',
                    )}>
                      <div className="flex items-start gap-3 mb-3">
                        <SportCover sport={event.sport as SportId} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-100 truncate">
                            {event.group_name ?? 'Evento avulso'}
                          </p>
                          <p className="text-xs text-slate-400 capitalize mt-0.5">
                            {date} · {time}
                          </p>
                        </div>
                        {status === 'confirmed' && (
                          <Badge variant="success" size="sm">Confirmado</Badge>
                        )}
                        {status === 'declined' && (
                          <Badge variant="error" size="sm">Recusado</Badge>
                        )}
                      </div>

                      {/* Slots bar */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">{event.participant_count}/{event.max_participants} confirmados</span>
                          <span className={cn('font-medium', slots > 0 ? 'text-primary-400' : 'text-amber-400')}>
                            {slots > 0 ? `${slots} vagas` : 'Lotado'}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(event.participant_count / event.max_participants) * 100}%` }}
                            transition={{ duration: 0.6, delay: i * 0.07 + 0.2 }}
                            className="h-full bg-primary-500 rounded-full"
                          />
                        </div>
                      </div>

                      {/* CTA */}
                      {(status === null || status === 'pending') && (
                        <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
                          <Button
                            size="sm"
                            fullWidth
                            onClick={() => handleConfirm(event.id)}
                            leftIcon={<Check className="size-3.5" strokeWidth={3} />}
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDecline(event.id)}
                            className="px-3"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      )}
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>

      {/* Meus grupos */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Meus grupos</h2>
          <Link href="/groups" className="text-xs text-primary-400 font-medium">Ver todos</Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card interactive className="flex-shrink-0 w-44 h-[172px] flex flex-col active:scale-95">
                  <SportCover sport={group.sport as SportId} size="md" className="mb-3" />
                  <p className="text-xs font-semibold text-slate-200 leading-snug line-clamp-2 mb-1">{group.name}</p>
                  <p className="text-[11px] text-slate-500">{group.member_count} membros</p>
                  <div className="mt-auto pt-2 h-5 flex items-center">
                    {group.my_role === 'admin' && (
                      <Badge variant="primary" size="sm">Admin</Badge>
                    )}
                  </div>
                </Card>
              </motion.div>
            </Link>
          ))}

          {/* Add group */}
          <Link href="/create/group">
            <div className="flex-shrink-0 w-44 h-full min-h-[140px] border border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all">
              <div className="size-10 rounded-xl bg-slate-800 flex items-center justify-center">
                <Plus className="size-5 text-slate-400" />
              </div>
              <span className="text-xs text-slate-500">Novo grupo</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Atividade recente */}
      {notifications.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Atividade recente</h2>
          <Card className="p-0 overflow-hidden">
            {notifications.map((notif, i) => (
              <div key={notif.id} className={cn('flex items-start gap-3 p-4', i > 0 && 'border-t border-slate-800')}>
                <div className="size-9 rounded-xl bg-slate-800 flex items-center justify-center text-lg flex-shrink-0" aria-hidden>
                  {[...notif.title][0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{notif.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.body}</p>
                </div>
                {!notif.is_read && <div className="size-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />}
              </div>
            ))}
            <Link href="/notifications" className="flex items-center justify-center gap-1 p-3 border-t border-slate-800 text-xs text-slate-500 hover:text-primary-400 transition-colors">
              Ver todas as notificações <ChevronRight className="size-3" />
            </Link>
          </Card>
        </section>
      )}
      </div>
    </div>
  )
}
