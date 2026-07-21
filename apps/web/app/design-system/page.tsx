'use client'

import { useState } from 'react'
import { Search, Mail, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar, AvatarGroup } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { SelectCardGroup } from '@/components/ui/SelectCard'
import { StepBar } from '@/components/ui/StepBar'
import { Skeleton, EventCardSkeleton, GroupCardSkeleton } from '@/components/ui/Skeleton'
import { Header } from '@/components/layout/Header'
import { Logo } from '@/components/shared/Logo'
import { SportCover } from '@/components/shared/SportCover'
import { SportIcon } from '@/components/shared/SportIcon'
import { ParticipantRow } from '@/components/shared/ParticipantRow'
import { SPORTS } from '@/lib/constants'
import type { EventParticipant } from '@/types/app.types'

/**
 * Galeria de todos os componentes do design system, pra referência visual.
 * Não é uma rota do produto — só um catálogo pra conferir consistência.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h2>
      <Card className="space-y-4">{children}</Card>
    </section>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2.5">{children}</div>
}

const sampleParticipant: EventParticipant = {
  id: 'p1',
  event_id: 'e1',
  user_id: 'u1',
  user: { id: 'u1', name: 'Rafael Souza', nickname: 'Rafa', avatar_url: undefined },
  status: 'confirmed',
  is_monthly: true,
  goals: 3,
  assists: 1,
  payment_status: 'paid',
}

export default function DesignSystemPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [stepperValue, setStepperValue] = useState(4)
  const [selectValue, setSelectValue] = useState<'a' | 'b' | 'c'>('a')
  const [inputValue, setInputValue] = useState('')

  return (
    <div className="min-h-screen pb-16">
      <Header title="Design System" showBack backHref="/home" />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        <div>
          <Logo size="lg" />
          <p className="text-sm text-slate-500 mt-2">
            Catálogo dos componentes base — cores, botões, cards e afins. PlayGroup cobre vários
            esportes (não só futebol), então os exemplos abaixo variam o esporte de propósito.
          </p>
        </div>

        <Section title="Cores da marca">
          <Row>
            {[
              { shade: '50',  className: 'bg-primary-50'  },
              { shade: '100', className: 'bg-primary-100' },
              { shade: '200', className: 'bg-primary-200' },
              { shade: '300', className: 'bg-primary-300' },
              { shade: '400', className: 'bg-primary-400' },
              { shade: '500', className: 'bg-primary-500' },
              { shade: '600', className: 'bg-primary-600' },
              { shade: '700', className: 'bg-primary-700' },
              { shade: '800', className: 'bg-primary-800' },
              { shade: '900', className: 'bg-primary-900' },
            ].map(({ shade, className }) => (
              <div key={shade} className="flex flex-col items-center gap-1">
                <div className={`size-10 rounded-xl border border-slate-800 ${className}`} />
                <span className="text-[10px] text-slate-500">{shade}</span>
              </div>
            ))}
          </Row>
        </Section>

        <Section title="Botões">
          <Row>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger</Button>
          </Row>
          <Row>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row>
            <Button leftIcon={<Search className="size-4" />}>Com ícone</Button>
            <Button loading>Carregando</Button>
            <Button disabled>Desabilitado</Button>
            <Button fullWidth>Full width</Button>
          </Row>
        </Section>

        <Section title="Badges">
          <Row>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="neutral">Neutral</Badge>
          </Row>
          <Row>
            <Badge size="sm" variant="primary">Small</Badge>
            <Badge size="md" variant="primary">Medium</Badge>
          </Row>
        </Section>

        <Section title="Cards">
          <p className="text-xs text-slate-500">
            Card padrão (bg-slate-900) elevado sobre o fundo da página (bg-slate-950) — a
            diferença de tom entre os dois é o que dá profundidade, não a borda.
          </p>
          <Row>
            <Card className="w-40">
              <p className="text-sm font-semibold text-slate-100">Estático</p>
              <p className="text-xs text-slate-500 mt-1">Sem interação</p>
            </Card>
            <Card interactive className="w-40">
              <p className="text-sm font-semibold text-slate-100">Interativo</p>
              <p className="text-xs text-slate-500 mt-1">Hover + active scale</p>
            </Card>
          </Row>
        </Section>

        <Section title="Inputs">
          <Input
            label="Nome"
            placeholder="Como você se chama?"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Input label="E-mail" placeholder="voce@email.com" leftIcon={<Mail className="size-4" />} />
          <Input label="Com erro" defaultValue="valor inválido" error="Esse campo é obrigatório" />
          <Input label="Com dica" hint="Isso aparece só quando não tem erro" />
        </Section>

        <Section title="Number Stepper">
          <NumberStepper
            label="Máximo de participantes"
            value={stepperValue}
            onChange={setStepperValue}
            min={0}
            max={30}
            hint={`${stepperValue} pessoas`}
          />
        </Section>

        <Section title="Select Card">
          <SelectCardGroup
            value={selectValue}
            onChange={setSelectValue}
            options={[
              { id: 'a', label: 'Só com link', description: 'Só quem tiver o link consegue entrar.', icon: '🔗' },
              { id: 'b', label: 'Público', description: 'Aparece na página de descoberta.', icon: '🌍' },
              { id: 'c', label: 'Privado', description: 'Só membros do grupo.', icon: '🔒' },
            ]}
          />
        </Section>

        <Section title="Step Bar">
          <StepBar current={2} total={4} labels={['Boas-vindas', 'Perfil', 'Foto', 'Esportes']} />
        </Section>

        <Section title="Avatar">
          <Row>
            <Avatar name="Rafael Souza" size="xs" />
            <Avatar name="Camila Nunes" size="sm" />
            <Avatar name="Diego Alves" size="md" />
            <Avatar name="Bianca Reis" size="lg" />
            <Avatar name="Thiago Lima" size="xl" />
          </Row>
          <AvatarGroup
            users={[
              { name: 'Rafael Souza' },
              { name: 'Camila Nunes' },
              { name: 'Diego Alves' },
              { name: 'Bianca Reis' },
              { name: 'Thiago Lima' },
              { name: 'Marina Costa' },
            ]}
            max={4}
          />
        </Section>

        <Section title="Esportes (SportIcon)">
          <p className="text-xs text-slate-500">
            {SPORTS.length} esportes suportados — futebol é só um deles.
          </p>
          <div className="grid grid-cols-4 gap-3">
            {SPORTS.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-1.5">
                <SportIcon sport={s.id} size="md" />
                <span className="text-[10px] text-slate-500 text-center leading-tight">{s.label}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Esportes (SportCover)">
          <Row>
            <SportCover sport="football" size="lg" />
            <SportCover sport="volleyball" size="lg" />
            <SportCover sport="basketball" size="lg" />
            <SportCover sport="tennis" size="lg" />
          </Row>
          <SportCover sport="beach" size="banner" className="w-full h-32 rounded-2xl" />
        </Section>

        <Section title="Participant Row">
          <ParticipantRow participant={sampleParticipant} position={1} showPayment />
          <ParticipantRow
            participant={{ ...sampleParticipant, id: 'p2', status: 'pending', is_monthly: false, payment_status: 'pending', user: { ...sampleParticipant.user, id: 'u2', name: 'Marina Costa', nickname: 'Mari' } }}
            position={2}
            showPayment
          />
          <ParticipantRow
            participant={{ ...sampleParticipant, id: 'p3', status: 'waitlist', payment_status: undefined, user: { ...sampleParticipant.user, id: 'u3', name: 'Você', nickname: 'Você' } }}
            position={3}
            isMe
          />
        </Section>

        <Section title="Skeletons">
          <Skeleton className="h-4 w-2/3" />
          <div className="grid grid-cols-2 gap-3">
            <EventCardSkeleton />
            <GroupCardSkeleton />
          </div>
        </Section>

        <Section title="Bottom Sheet">
          <Button onClick={() => setSheetOpen(true)}>Abrir Bottom Sheet</Button>
          <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Exemplo de Bottom Sheet">
            <p className="text-sm text-slate-300">Conteúdo qualquer aqui dentro.</p>
            <Button fullWidth className="mt-4" onClick={() => setSheetOpen(false)}>Fechar</Button>
          </BottomSheet>
        </Section>

        <Section title="Header (variação usada nesta própria página)">
          <div className="rounded-2xl overflow-hidden border border-slate-800">
            <Header title="Título da tela" showBack rightAction={<button className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-800"><ChevronLeft className="size-4 rotate-180" /></button>} />
          </div>
        </Section>
      </div>
    </div>
  )
}
