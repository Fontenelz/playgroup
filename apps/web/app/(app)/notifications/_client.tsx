'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, CheckCheck, BellOff } from 'lucide-react'
import { markNotificationRead, markAllNotificationsRead, deleteNotification } from '@/lib/actions/notifications'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types/app.types'

// ── Type config ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { bg: string; ring: string }> = {
  waitlist_called:  { bg: 'bg-primary-500/20',  ring: 'ring-primary-500/40'  },
  payment_received: { bg: 'bg-emerald-500/20',  ring: 'ring-emerald-500/40'  },
  payment_overdue:  { bg: 'bg-red-500/20',      ring: 'ring-red-500/40'      },
  member_joined:    { bg: 'bg-sky-500/20',      ring: 'ring-sky-500/40'      },
  event_reminder:   { bg: 'bg-amber-500/20',    ring: 'ring-amber-500/40'    },
  event_created:    { bg: 'bg-violet-500/20',   ring: 'ring-violet-500/40'   },
  event_cancelled:  { bg: 'bg-red-500/20',      ring: 'ring-red-500/40'      },
  ranking_update:   { bg: 'bg-amber-500/20',    ring: 'ring-amber-500/40'    },
}

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? { bg: 'bg-slate-700/40', ring: 'ring-slate-600/40' }
}

// ── Time grouping ─────────────────────────────────────────────────────────────

function getGroup(dateStr: string): string {
  const now  = new Date()
  const date = new Date(dateStr)
  const diffH = (now.getTime() - date.getTime()) / 3600000

  if (diffH < 24)  return 'Hoje'
  if (diffH < 48)  return 'Ontem'
  if (diffH < 168) return 'Esta semana'
  return 'Mais antigas'
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)    return 'agora'
  if (diff < 3600)  return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  const d = Math.floor(diff / 86400)
  return `${d} dia${d > 1 ? 's' : ''} atrás`
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface NotificationsClientProps {
  initialNotifications: Notification[]
}

export default function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    startTransition(async () => {
      await markAllNotificationsRead()
    })
  }

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    startTransition(async () => {
      await markNotificationRead(id)
    })
  }

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    startTransition(async () => {
      await deleteNotification(id)
    })
  }

  function handleTap(notif: Notification) {
    markRead(notif.id)
    const { groupId, eventId } = notif.data
    if (eventId && groupId) router.push(`/groups/${groupId}/events/${eventId}`)
    else if (groupId)       router.push(`/groups/${groupId}`)
  }

  // Group by time
  const grouped = useMemo(() => {
    const ORDER = ['Hoje', 'Ontem', 'Esta semana', 'Mais antigas']
    const map = new Map<string, Notification[]>()
    for (const n of notifications) {
      const g = getGroup(n.created_at)
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(n)
    }
    return ORDER.filter((g) => map.has(g)).map((g) => ({ label: g, items: map.get(g)! }))
  }, [notifications])

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

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-slate-100">Notificações</p>
              {unreadCount > 0 && (
                <span className="text-xs font-bold bg-primary-500 text-white px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
            >
              <CheckCheck className="size-3.5" />
              Marcar todas
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 pb-24">
        {notifications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="py-4 space-y-6">
            {grouped.map(({ label, items }) => (
              <div key={label}>
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {label}
                </p>
                <div className="space-y-0.5">
                  <AnimatePresence mode="popLayout">
                    {items.map((notif) => (
                      <NotifItem
                        key={notif.id}
                        notif={notif}
                        onTap={() => handleTap(notif)}
                        onDismiss={() => dismiss(notif.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Notification item ─────────────────────────────────────────────────────────

function NotifItem({
  notif, onTap, onDismiss,
}: {
  notif: Notification
  onTap: () => void
  onDismiss: () => void
}) {
  const cfg   = getConfig(notif.type)
  const emoji = [...notif.title][0]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, transition: { duration: 0.2 } }}
      className={cn(
        'relative flex items-start gap-3 px-4 py-4 cursor-pointer transition-colors active:bg-slate-900/80',
        !notif.is_read ? 'bg-slate-900/50' : 'bg-transparent hover:bg-slate-900/30',
      )}
      onClick={onTap}
    >
      {/* Unread dot */}
      {!notif.is_read && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary-500" />
      )}

      {/* Icon */}
      <div className={cn(
        'size-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg ring-1',
        cfg.bg, cfg.ring,
      )}>
        {emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm leading-snug',
          notif.is_read ? 'font-normal text-slate-300' : 'font-semibold text-slate-100',
        )}>
          {notif.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
          {notif.body}
        </p>
        <p className="text-[11px] text-slate-600 mt-1">{timeAgo(notif.created_at)}</p>
      </div>

      {/* Dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss() }}
        className="size-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-400 hover:bg-slate-800 transition-all cursor-pointer flex-shrink-0 mt-0.5"
      >
        ×
      </button>
    </motion.div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="size-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
        <BellOff className="size-8 text-slate-600" />
      </div>
      <p className="text-slate-300 font-semibold">Tudo em dia!</p>
      <p className="text-sm text-slate-500 mt-1">Nenhuma notificação por aqui.</p>
    </div>
  )
}
