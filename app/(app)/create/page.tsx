'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Users, Calendar, LinkIcon } from 'lucide-react'

const options = [
  { icon: Users,    emoji: '🏆', label: 'Criar grupo',           desc: 'Futebol, vôlei, beach tennis...', href: '/groups/create' },
  { icon: Calendar, emoji: '📅', label: 'Criar evento',           desc: 'Avulso ou recorrente',            href: '/groups' },
  { icon: LinkIcon, emoji: '🔗', label: 'Entrar com link',        desc: 'Cole um link de convite',         href: '/join' },
]

export default function CreatePage() {
  return (
    <div>
      <Header title="Criar" showBack />
      <div className="px-4 py-6 space-y-3">
        <p className="text-sm text-slate-400">O que você quer fazer?</p>
        {options.map(({ emoji, label, desc, href }) => (
          <Link key={href} href={href}>
            <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-primary-500/40 hover:bg-primary-500/5 transition-all active:scale-[0.99]">
              <div className="size-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl">
                {emoji}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
