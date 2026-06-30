import { Star, Clock } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { EventParticipant } from '@/types/app.types'

interface ParticipantRowProps {
  participant: EventParticipant
  position?: number
  isMe?: boolean
  showPayment?: boolean
}

const statusConfig = {
  confirmed: { label: 'Confirmado', variant: 'success'  as const },
  pending:   { label: 'Pendente',   variant: 'warning'  as const },
  declined:  { label: 'Recusou',    variant: 'error'    as const },
  absent:    { label: 'Ausente',    variant: 'error'    as const },
  present:   { label: 'Presente',   variant: 'success'  as const },
  waitlist:  { label: 'Fila',       variant: 'info'     as const },
}

const paymentConfig = {
  paid:      { label: 'Pago',      variant: 'success' as const },
  pending:   { label: 'A pagar',   variant: 'warning' as const },
  overdue:   { label: 'Atrasado',  variant: 'error'   as const },
  cancelled: { label: 'Cancelado', variant: 'neutral' as const },
  refunded:  { label: 'Devolvido', variant: 'neutral' as const },
}

export function ParticipantRow({ participant, position, isMe, showPayment = false }: ParticipantRowProps) {
  const { user, status, is_monthly, payment_status } = participant
  const statusCfg = statusConfig[status]
  const payCfg = payment_status ? paymentConfig[payment_status] : null

  return (
    <div className={cn(
      'flex items-center gap-3 py-3 px-4',
      isMe && 'bg-primary-500/5 rounded-xl',
    )}>
      {position != null && (
        <span className="w-5 text-xs text-slate-500 text-center flex-shrink-0">{position}</span>
      )}

      <div className="relative flex-shrink-0">
        <Avatar name={user.name} src={user.avatar_url} size="sm" />
        {is_monthly && (
          <div className="absolute -top-1 -right-1 size-4 rounded-full bg-amber-500 flex items-center justify-center">
            <Star className="size-2.5 text-white fill-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isMe ? 'text-primary-300' : 'text-slate-200')}>
          {user.nickname}
          {isMe && <span className="text-xs text-slate-500 ml-1">(você)</span>}
        </p>
        {is_monthly && (
          <p className="text-[11px] text-amber-500/80 flex items-center gap-1">
            <Star className="size-2.5 fill-current" /> Mensalista
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {showPayment && payCfg && (
          <Badge variant={payCfg.variant} size="sm">{payCfg.label}</Badge>
        )}
        <Badge variant={statusCfg.variant} size="sm">{statusCfg.label}</Badge>
      </div>
    </div>
  )
}

interface WaitlistRowProps {
  position: number
  name: string
  avatarUrl?: string
  joinedAt: string
  status: 'waiting' | 'notified' | 'confirmed' | 'expired' | 'left'
  expiresAt?: string
  isMe?: boolean
}

export function WaitlistRow({ position, name, avatarUrl, joinedAt, status, expiresAt, isMe }: WaitlistRowProps) {
  const waitingTime = (() => {
    const diff = Date.now() - new Date(joinedAt).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    if (h > 0) return `${h}h na fila`
    return `${m}min na fila`
  })()

  const timeLeft = (() => {
    if (!expiresAt || status !== 'notified') return null
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expirado'
    const m = Math.floor(diff / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return `${m}:${String(s).padStart(2, '0')} restantes`
  })()

  return (
    <div className={cn(
      'flex items-center gap-3 py-3 px-4',
      isMe && 'bg-primary-500/5 rounded-xl',
      status === 'notified' && 'bg-amber-500/5 rounded-xl',
    )}>
      <div className={cn(
        'size-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
        position === 1 ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-400',
      )}>
        {position}
      </div>

      <Avatar name={name} src={avatarUrl} size="sm" />

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isMe ? 'text-primary-300' : 'text-slate-200')}>
          {name}
          {isMe && <span className="text-xs text-slate-500 ml-1">(você)</span>}
        </p>
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <Clock className="size-2.5" /> {waitingTime}
        </p>
      </div>

      {status === 'notified' && timeLeft && (
        <div className="text-right">
          <Badge variant="warning" size="sm">Chamado</Badge>
          <p className="text-[10px] text-amber-400 mt-0.5">{timeLeft}</p>
        </div>
      )}
    </div>
  )
}
