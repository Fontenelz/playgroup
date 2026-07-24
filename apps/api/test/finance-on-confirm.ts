/**
 * Valida a mudança do item A1.1 (docs/plano-de-acao-arquitetura.md): a cobrança
 * (Payment) de um evento de grupo precisa ser criada no momento em que a
 * participação é confirmada — não mais como efeito colateral de GET /finance,
 * que agora só lê. Roda contra um Postgres real.
 *
 * Uso: pnpm --filter api test:finance-on-confirm
 */
import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { EventsService } from '../src/events/events.service'
import { GroupsService } from '../src/groups/groups.service'
import { PrismaService } from '../src/prisma/prisma.service'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Teste finance-on-confirm falhou: ${message}`)
}

const PER_EVENT_FEE = 20

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false })
  await app.init()

  const prisma = app.get(PrismaService)
  const events = app.get(EventsService)
  const groups = app.get(GroupsService)

  const organizerId = randomUUID()
  const memberId = randomUUID()
  let groupId = ''
  let eventId = ''

  try {
    await prisma.user.create({
      data: { id: organizerId, name: 'Finance Organizer', nickname: 'Organizer' },
    })
    await prisma.user.create({ data: { id: memberId, name: 'Finance Member', nickname: 'Member' } })

    const group = await groups.create(organizerId, {
      sport: 'football',
      name: 'Grupo Finance Test',
      accessType: 'invite',
      maxMembers: 20,
      perEventFee: PER_EVENT_FEE,
    })
    groupId = group.id

    await prisma.groupMember.create({
      data: {
        groupId,
        userId: memberId,
        role: 'participant',
        memberType: 'regular',
        status: 'active',
      },
    })

    const event = await events.create(groupId, organizerId, {
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
    eventId = event.id

    // GET /finance antes de qualquer confirmação: não deveria criar nenhuma cobrança.
    const beforeConfirm = await events.financeData(eventId, organizerId)
    assert(
      beforeConfirm.participants.length === 0,
      'não deveria haver participante confirmado antes da confirmação',
    )
    const paymentsBeforeConfirm = await prisma.payment.count({ where: { eventId } })
    assert(paymentsBeforeConfirm === 0, 'GET /finance não deveria criar Payment nenhum (read-only)')

    // Confirmar participação é o que deve gerar a cobrança agora.
    await events.confirmParticipation(eventId, memberId)

    const payment = await prisma.payment.findUnique({
      where: { eventId_userId: { eventId, userId: memberId } },
    })
    assert(payment !== null, 'Payment deveria ter sido criado no momento da confirmação')
    assert(
      Number(payment?.amount) === PER_EVENT_FEE,
      `amount da cobrança deveria ser ${PER_EVENT_FEE}, veio ${payment?.amount}`,
    )
    assert(
      payment?.status === 'pending',
      `status inicial deveria ser pending, veio ${payment?.status}`,
    )

    // GET /finance depois: deve só ler o que já foi criado, sem duplicar/recriar.
    const afterConfirm = await events.financeData(eventId, organizerId)
    const participant = afterConfirm.participants.find((p) => p.user_id === memberId)
    assert(participant !== undefined, 'participante confirmado deveria aparecer no financeiro')
    assert(
      participant?.payment_id === payment?.id,
      'financeData deveria referenciar o mesmo Payment já criado na confirmação',
    )
    assert(afterConfirm.fee === PER_EVENT_FEE, `fee exibido deveria ser ${PER_EVENT_FEE}`)

    const totalPayments = await prisma.payment.count({ where: { eventId } })
    assert(
      totalPayments === 1,
      `GET /finance não deveria duplicar Payment (esperado 1, veio ${totalPayments})`,
    )

    console.log(
      '✔ finance-on-confirm: Payment criado na confirmação, GET /finance permanece read-only',
    )
  } finally {
    if (eventId) {
      await prisma.payment.deleteMany({ where: { eventId } })
      await prisma.eventParticipant.deleteMany({ where: { eventId } })
      await prisma.event.delete({ where: { id: eventId } }).catch(() => {})
    }
    if (groupId) {
      await prisma.groupMember.deleteMany({ where: { groupId } })
      await prisma.group.delete({ where: { id: groupId } }).catch(() => {})
    }
    await prisma.user.deleteMany({ where: { id: { in: [organizerId, memberId] } } })
    await app.close()
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
