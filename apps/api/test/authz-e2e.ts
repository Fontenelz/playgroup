/**
 * Testes de autorização (item A1.3, docs/plano-de-acao-arquitetura.md) contra o
 * AppModule real — mesmo estilo de test/smoke.ts (NestFactory + chamada direta
 * aos services, exercitando o AuthzService de verdade), cobrindo as rotas mais
 * sensíveis que ainda não tinham teste: mark-paid, remove member, update-member-role
 * e reject-participant (approve-participant já é coberto pelo smoke test).
 *
 * Não usamos Supertest/HTTP real aqui porque os guards exigem um JWT do Supabase
 * verificado via JWKS remoto — sem um projeto Supabase real configurado neste
 * ambiente, testar via HTTP exigiria mockar a verificação do token. Chamar os
 * services diretamente com o DI graph real (via NestFactory, não um mock de
 * módulo) ainda exercita o AuthzService de ponta a ponta contra o Postgres real,
 * que é o que importa validar aqui.
 *
 * Uso: pnpm --filter api test:authz
 */
import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { EventsService } from '../src/events/events.service'
import { GroupsService } from '../src/groups/groups.service'
import { PaymentsService } from '../src/payments/payments.service'
import { PrismaService } from '../src/prisma/prisma.service'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Teste de autorização falhou: ${message}`)
}

async function expectForbidden(fn: () => Promise<unknown>, message: string) {
  let blocked = false
  try {
    await fn()
  } catch {
    blocked = true
  }
  assert(blocked, message)
}

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false })
  await app.init()

  const prisma = app.get(PrismaService)
  const groups = app.get(GroupsService)
  const events = app.get(EventsService)
  const payments = app.get(PaymentsService)

  const adminId = randomUUID()
  const organizerId = randomUUID()
  const memberId = randomUUID()
  const extraId = randomUUID()
  const plainMemberId = randomUUID()
  const guestId = randomUUID()
  const userIds = [adminId, organizerId, memberId, extraId, plainMemberId, guestId]

  let groupId = ''
  let groupEventId = ''
  let standaloneEventId = ''

  try {
    await prisma.user.createMany({
      data: userIds.map((id, i) => ({ id, name: `Authz User ${i}`, nickname: `AU${i}` })),
    })

    // ── Setup: grupo com admin + organizer + membros regulares ──────────────
    const group = await groups.create(adminId, {
      sport: 'football',
      name: 'Grupo Authz Test',
      accessType: 'invite',
      maxMembers: 20,
      perEventFee: 10,
    })
    groupId = group.id

    await prisma.groupMember.createMany({
      data: [
        {
          groupId,
          userId: organizerId,
          role: 'organizer',
          memberType: 'regular',
          status: 'active',
        },
        { groupId, userId: memberId, role: 'participant', memberType: 'regular', status: 'active' },
        { groupId, userId: extraId, role: 'participant', memberType: 'regular', status: 'active' },
        {
          groupId,
          userId: plainMemberId,
          role: 'participant',
          memberType: 'regular',
          status: 'active',
        },
      ],
    })

    const groupEvent = await events.create(groupId, adminId, {
      date: '2026-12-31',
      startTime: '10:00',
      endTime: '11:00',
      recurrence: 'none',
      weekDays: [],
      seriesEnd: '',
      maxParticipants: 10,
      monthlySlots: 0,
      monthlyConfirmHours: 0,
    })
    groupEventId = groupEvent.id

    await events.confirmParticipation(groupEventId, memberId)
    await events.confirmParticipation(groupEventId, extraId)

    const memberPayment = await prisma.payment.findUniqueOrThrow({
      where: { eventId_userId: { eventId: groupEventId, userId: memberId } },
    })
    const extraPayment = await prisma.payment.findUniqueOrThrow({
      where: { eventId_userId: { eventId: groupEventId, userId: extraId } },
    })

    // ── mark-paid ────────────────────────────────────────────────────────────
    await expectForbidden(
      () => payments.markPaid(memberPayment.id, memberId),
      'participante comum não deveria poder marcar a própria cobrança como paga',
    )
    const paidByOrganizer = await payments.markPaid(memberPayment.id, organizerId)
    assert(
      paidByOrganizer.status === 'paid',
      'organizador deveria conseguir marcar cobrança como paga',
    )
    const paidByAdmin = await payments.markPaid(extraPayment.id, adminId)
    assert(paidByAdmin.status === 'paid', 'admin deveria conseguir marcar cobrança como paga')

    // ── update-member-role (exige admin de verdade, organizer não basta) ────
    await expectForbidden(
      () => groups.updateMemberRole(groupId, organizerId, memberId, 'organizer'),
      'organizador (não-admin) não deveria poder promover outro membro',
    )
    await groups.updateMemberRole(groupId, adminId, memberId, 'organizer')
    const promoted = await prisma.groupMember.findFirst({ where: { groupId, userId: memberId } })
    assert(promoted?.role === 'organizer', 'admin deveria conseguir promover um membro')

    // ── remove-member ────────────────────────────────────────────────────────
    await expectForbidden(
      () => groups.removeMember(groupId, plainMemberId, extraId),
      'membro comum não deveria poder remover outro membro',
    )
    await expectForbidden(
      () => groups.removeMember(groupId, adminId, adminId),
      'não deveria ser possível remover o dono do grupo',
    )
    await groups.removeMember(groupId, adminId, extraId)
    const removed = await prisma.groupMember.findFirst({ where: { groupId, userId: extraId } })
    assert(removed?.status === 'banned', 'admin deveria conseguir remover um membro')

    // ── reject-participant (evento avulso público) ──────────────────────────
    const standalone = await events.createStandalone(adminId, {
      sport: 'football',
      date: '2026-12-31',
      startTime: '10:00',
      endTime: '11:00',
      maxParticipants: 10,
      visibility: 'public',
    })
    standaloneEventId = standalone.id
    await prisma.eventParticipant.create({
      data: { eventId: standaloneEventId, userId: guestId, status: 'pending' },
    })

    await expectForbidden(
      () => events.rejectParticipant(standaloneEventId, guestId, plainMemberId),
      'quem não é dono do evento avulso não deveria poder rejeitar participante',
    )
    await events.rejectParticipant(standaloneEventId, guestId, adminId)
    const rejected = await prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId: standaloneEventId, userId: guestId } },
    })
    assert(
      rejected?.status === 'declined',
      'dono do evento deveria conseguir rejeitar participante',
    )

    console.log(
      '✔ authz-e2e: mark-paid, update-member-role, remove-member e reject-participant respeitam AuthzService',
    )
  } finally {
    if (groupEventId) {
      await prisma.payment.deleteMany({ where: { eventId: groupEventId } })
      await prisma.eventParticipant.deleteMany({ where: { eventId: groupEventId } })
      await prisma.event.delete({ where: { id: groupEventId } }).catch(() => {})
    }
    if (standaloneEventId) {
      await prisma.eventParticipant.deleteMany({ where: { eventId: standaloneEventId } })
      await prisma.event.delete({ where: { id: standaloneEventId } }).catch(() => {})
    }
    if (groupId) {
      await prisma.groupMember.deleteMany({ where: { groupId } })
      await prisma.group.delete({ where: { id: groupId } }).catch(() => {})
    }
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await app.close()
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
