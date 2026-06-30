'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Users, Calendar, LinkIcon, ArrowRight } from 'lucide-react'

export default function CreatePage() {
  const router = useRouter()
  const [showInviteInput, setShowInviteInput] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  function handleJoin() {
    const code = inviteCode.trim()
    if (!code) return
    // Extract code from full URL or use raw code
    const match = code.match(/\/join\/([^/?#]+)/) ?? code.match(/([a-z0-9-]+)$/i)
    const slug  = match ? match[1] : code
    router.push(`/join/${encodeURIComponent(slug)}`)
  }

  return (
    <div>
      <Header title="Criar" showBack />
      <div className="px-4 py-6 space-y-3">
        <p className="text-sm text-slate-400">O que você quer fazer?</p>

        <Link href="/create/group">
          <OptionCard emoji="🏆" label="Criar grupo" desc="Futebol, vôlei, beach tennis..." />
        </Link>

        <Link href="/groups">
          <OptionCard emoji="📅" label="Criar evento" desc="Avulso ou recorrente" />
        </Link>

        {/* Invite card — expands to reveal input */}
        <div>
          <button
            onClick={() => setShowInviteInput((v) => !v)}
            className="w-full text-left"
          >
            <OptionCard
              emoji="🔗"
              label="Entrar com link"
              desc="Cole um link ou código de convite"
              active={showInviteInput}
            />
          </button>

          <AnimatePresence>
            {showInviteInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-900 border border-t-0 border-slate-800 rounded-b-2xl px-4 pb-4 space-y-3">
                  <input
                    autoFocus
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    placeholder="playgroup.app/join/ft-quinta ou ft-quinta"
                    className="w-full h-11 bg-slate-800 border border-slate-700 rounded-xl px-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                  <Button
                    fullWidth
                    onClick={handleJoin}
                    disabled={!inviteCode.trim()}
                    rightIcon={<ArrowRight className="size-4" />}
                  >
                    Acessar grupo
                  </Button>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-600 font-medium">Códigos de teste:</p>
                    {['ft-quinta', 'volei-sl', 'beach-2025'].map((c) => (
                      <button
                        key={c}
                        onClick={() => { setInviteCode(c); router.push(`/join/${c}`) }}
                        className="text-xs text-primary-500 hover:text-primary-400 transition-colors cursor-pointer block"
                      >
                        → {c}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function OptionCard({
  emoji, label, desc, active,
}: {
  emoji: string
  label: string
  desc: string
  active?: boolean
}) {
  return (
    <div className={`flex items-center gap-4 bg-slate-900 border rounded-2xl p-4 transition-all active:scale-[0.99] ${active ? 'border-primary-500/60 bg-primary-500/5 rounded-b-none' : 'border-slate-800 hover:border-primary-500/40 hover:bg-primary-500/5'}`}>
      <div className="size-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
        {emoji}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-100">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  )
}
