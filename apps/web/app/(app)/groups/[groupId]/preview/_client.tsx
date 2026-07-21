'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Users, Lock, Globe, Check, Clock3 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { SportCover } from '@/components/shared/SportCover'
import { SportIcon } from '@/components/shared/SportIcon'
import { requestToJoinGroup } from '@/lib/actions/groups'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'

export interface GroupPreviewData {
  id: string
  name: string
  description: string | null
  sport: string
  max_members: number
  member_count: number
  access_type: string
  my_status: 'none' | 'pending' | 'active'
}

export default function GroupPreviewClient({ groupId, preview }: { groupId: string; preview: GroupPreviewData }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(preview.my_status)

  const sport = SPORT_MAP[preview.sport as SportId]

  function handleRequest() {
    setLoading(true)
    startTransition(async () => {
      const result = await requestToJoinGroup(groupId)
      setLoading(false)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.status === 'active') {
        router.push(`/groups/${groupId}`)
        return
      }
      setStatus('pending')
      toast.success('Solicitação enviada! O organizador vai revisar.')
    })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBack title="Grupo público" />

      <div className="relative h-40 flex-shrink-0">
        <SportCover sport={preview.sport as SportId} size="banner" className="absolute inset-0" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
      </div>

      <div className="flex-1 px-4 py-6 pb-32 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center gap-4"
        >
          <SportIcon sport={preview.sport as SportId} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{preview.name}</h1>
            <div className="flex items-center justify-center gap-1.5 mt-1 text-slate-400">
              <Users className="size-3.5" />
              <span className="text-sm">{preview.member_count}/{preview.max_members} membros</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Badge variant="primary" size="sm">{sport?.emoji} {sport?.label}</Badge>
            <Badge variant="neutral" size="sm">
              {preview.access_type === 'private' ? (
                <><Lock className="size-3 inline mr-1" />Privado</>
              ) : (
                <><Globe className="size-3 inline mr-1" />Público</>
              )}
            </Badge>
          </div>

          {preview.description && (
            <p className="text-sm text-slate-400 max-w-[280px] leading-relaxed">{preview.description}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <Card className="text-center">
            <p className="text-xl font-bold text-slate-100">{preview.member_count}</p>
            <p className="text-xs text-slate-500 mt-0.5">Membros ativos</p>
          </Card>
        </motion.div>

        {status === 'active' && (
          <div className="flex items-center gap-3 bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
            <Check className="size-4 text-primary-400 flex-shrink-0" strokeWidth={3} />
            <p className="text-sm text-primary-300">Você já é membro deste grupo.</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <Clock3 className="size-4 text-amber-400 flex-shrink-0" strokeWidth={3} />
            <p className="text-sm text-amber-300">
              Solicitação enviada. O organizador ainda vai revisar seu pedido de entrada.
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-4 py-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/60 space-y-3">
        {status === 'active' ? (
          <Button fullWidth size="lg" onClick={() => router.push(`/groups/${groupId}`)}>
            Ver grupo
          </Button>
        ) : status === 'pending' ? (
          <Button fullWidth size="lg" disabled leftIcon={<Clock3 className="size-5" />}>
            Solicitação pendente
          </Button>
        ) : (
          <>
            <Button fullWidth size="lg" onClick={handleRequest} loading={loading}>
              Solicitar entrada
            </Button>
            <p className="text-center text-xs text-slate-600">
              Ao solicitar, o organizador será notificado e pode aprovar ou recusar.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
