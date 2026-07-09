/**
 * Smoke test end-to-end do módulo de eventos avulsos + RSVP de convidado.
 *
 * Roda contra um Postgres real (local ou o service container do CI) e sobe a
 * aplicação Nest inteira via NestFactory — isso valida o grafo de injeção de
 * dependência de verdade (o mesmo jeito que quebrou em produção em 2026-07-08
 * quando imports viraram `import type` por engano) e não só a lógica de negócio.
 *
 * Uso: pnpm --filter api test:smoke
 */
import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { EventsService } from '../src/events/events.service'
import { GuestEventsService } from '../src/guest-events/guest-events.service'
import { PrismaService } from '../src/prisma/prisma.service'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Smoke test falhou: ${message}`)
}

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false })
  await app.init()

  const prisma = app.get(PrismaService)
  const events = app.get(EventsService)
  const guestEvents = app.get(GuestEventsService)

  const organizerId = randomUUID()
  const approvedGuestId = randomUUID()
  const rejectedGuestId = randomUUID()
  const userIds = [organizerId, approvedGuestId, rejectedGuestId]
  let eventId = ''

  try {
    await prisma.user.create({
      data: { id: organizerId, name: 'Smoke Organizer', nickname: 'Organizer' },
    })

    const created = await events.createStandalone(organizerId, {
      sport: 'football',
      date: '2026-12-31',
      startTime: '10:00',
      endTime: '11:00',
      maxParticipants: 10,
      visibility: 'public',
    })
    eventId = created.id

    const anonPreview = await guestEvents.preview(eventId, undefined)
    assert(
      anonPreview.status_code === 'auth_required',
      `preview anônimo em evento avulso público deveria ser auth_required, veio ${anonPreview.status_code}`,
    )

    const ownerPreview = await guestEvents.preview(eventId, organizerId)
    assert(ownerPreview.status_code === 'ok', 'preview autenticado deveria ser ok')

    await prisma.user.create({
      data: { id: approvedGuestId, name: 'Guest Aprovado', nickname: 'GuestA' },
    })
    await prisma.user.create({
      data: { id: rejectedGuestId, name: 'Guest Rejeitado', nickname: 'GuestB' },
    })

    const confirmResult = await guestEvents.confirmAsGuest(eventId, approvedGuestId, undefined)
    assert(
      confirmResult.status === 'pending',
      `pedido de participação em evento avulso público deveria começar pending, veio ${confirmResult.status}`,
    )

    const beforeApproval = await prisma.event.findUniqueOrThrow({ where: { id: eventId } })
    assert(
      beforeApproval.participantCount === 0,
      'contador de participantes não deveria incrementar antes da aprovação',
    )

    await events.approveParticipant(eventId, approvedGuestId, organizerId)
    const approved = await prisma.eventParticipant.findUniqueOrThrow({
      where: { eventId_userId: { eventId, userId: approvedGuestId } },
    })
    assert(approved.status === 'confirmed', 'participante aprovado deveria estar confirmed')

    const afterApproval = await prisma.event.findUniqueOrThrow({ where: { id: eventId } })
    assert(
      afterApproval.participantCount === 1,
      `contador deveria ser 1 após aprovação, veio ${afterApproval.participantCount}`,
    )

    await guestEvents.confirmAsGuest(eventId, rejectedGuestId, undefined)
    await events.rejectParticipant(eventId, rejectedGuestId, organizerId)
    const rejected = await prisma.eventParticipant.findUniqueOrThrow({
      where: { eventId_userId: { eventId, userId: rejectedGuestId } },
    })
    assert(rejected.status === 'declined', 'participante rejeitado deveria estar declined')

    const afterReject = await prisma.event.findUniqueOrThrow({ where: { id: eventId } })
    assert(
      afterReject.participantCount === 1,
      'contador não deveria mudar quando um participante é rejeitado',
    )

    let nonOwnerBlocked = false
    try {
      await events.approveParticipant(eventId, approvedGuestId, rejectedGuestId)
    } catch {
      nonOwnerBlocked = true
    }
    assert(nonOwnerBlocked, 'usuário que não é dono do evento avulso não deveria conseguir aprovar')

    console.log('✔ smoke: NestFactory + DI resolveram e o fluxo de RSVP de convidado passou')
  } finally {
    if (eventId) {
      await prisma.eventParticipant.deleteMany({ where: { eventId } })
      await prisma.event.delete({ where: { id: eventId } }).catch(() => {})
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
