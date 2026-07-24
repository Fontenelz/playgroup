/**
 * Teste de concorrência do fluxo de confirmação/fila de espera (ver docs/plano-de-acao-arquitetura.md,
 * item A0.3). Roda contra um Postgres real e dispara N confirmações simultâneas para um evento
 * com menos vagas que solicitantes — sem a correção (reserva atômica + $transaction), esse teste
 * falhava de forma intermitente com participant_count > max_participants.
 *
 * Uso: pnpm --filter api test:concurrency
 */
import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { EventsService } from '../src/events/events.service'
import { PrismaService } from '../src/prisma/prisma.service'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Teste de concorrência falhou: ${message}`)
}

const MAX_PARTICIPANTS = 5
const CONCURRENT_USERS = 20

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false })
  await app.init()

  const prisma = app.get(PrismaService)
  const events = app.get(EventsService)

  const organizerId = randomUUID()
  const userIds = Array.from({ length: CONCURRENT_USERS }, () => randomUUID())
  let eventId = ''

  try {
    await prisma.user.create({
      data: { id: organizerId, name: 'Concurrency Organizer', nickname: 'Organizer' },
    })
    await prisma.user.createMany({
      data: userIds.map((id, i) => ({ id, name: `User ${i}`, nickname: `U${i}` })),
    })

    const created = await events.createStandalone(organizerId, {
      sport: 'football',
      date: '2026-12-31',
      startTime: '10:00',
      endTime: '11:00',
      maxParticipants: MAX_PARTICIPANTS,
      visibility: 'link_only',
    })
    eventId = created.id

    // Todos tentam confirmar ao mesmo tempo — mais gente do que vagas.
    await Promise.all(userIds.map((userId) => events.confirmParticipation(eventId, userId)))

    const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } })
    const confirmedCount = await prisma.eventParticipant.count({
      where: { eventId, status: 'confirmed' },
    })
    const pendingCount = await prisma.eventParticipant.count({
      where: { eventId, status: 'pending' },
    })

    assert(
      event.participantCount <= MAX_PARTICIPANTS,
      `participant_count (${event.participantCount}) não pode passar de max_participants (${MAX_PARTICIPANTS})`,
    )
    assert(
      confirmedCount === MAX_PARTICIPANTS,
      `deveriam ser exatamente ${MAX_PARTICIPANTS} confirmados, vieram ${confirmedCount}`,
    )
    assert(
      confirmedCount + pendingCount === CONCURRENT_USERS,
      `todo mundo devia terminar confirmed ou pending (${confirmedCount + pendingCount} de ${CONCURRENT_USERS})`,
    )
    assert(
      event.participantCount === confirmedCount,
      `participant_count (${event.participantCount}) deveria bater com o nº de confirmados (${confirmedCount})`,
    )

    console.log(
      `✔ concurrency: ${CONCURRENT_USERS} confirmações simultâneas, ${confirmedCount} confirmadas (limite ${MAX_PARTICIPANTS}), participant_count consistente`,
    )
  } finally {
    if (eventId) {
      await prisma.eventParticipant.deleteMany({ where: { eventId } })
      await prisma.event.delete({ where: { id: eventId } }).catch(() => {})
    }
    await prisma.user.deleteMany({ where: { id: { in: [organizerId, ...userIds] } } })
    await app.close()
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
