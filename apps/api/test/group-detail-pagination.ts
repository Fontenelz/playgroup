/**
 * Valida o item A1.2 (docs/plano-de-acao-arquitetura.md): GroupsService.getDetail
 * pagina a lista de eventos exibida, mas o ranking de presença continua
 * considerando o histórico completo do grupo (não só a janela paginada).
 * Roda contra um Postgres real.
 *
 * Uso: pnpm --filter api test:group-pagination
 */
import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { GroupsService } from '../src/groups/groups.service'
import { PrismaService } from '../src/prisma/prisma.service'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Teste group-detail-pagination falhou: ${message}`)
}

const PAST_EVENTS_TO_CREATE = 25 // acima do PAST_EVENTS_LIMIT (15) hardcoded em groups.service.ts

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false })
  await app.init()

  const prisma = app.get(PrismaService)
  const groups = app.get(GroupsService)

  const organizerId = randomUUID()
  const memberId = randomUUID()
  let groupId = ''
  const eventIds: string[] = []

  try {
    await prisma.user.create({
      data: { id: organizerId, name: 'Pagination Organizer', nickname: 'Organizer' },
    })
    await prisma.user.create({
      data: { id: memberId, name: 'Pagination Member', nickname: 'Member' },
    })

    const group = await groups.create(organizerId, {
      sport: 'football',
      name: 'Grupo Pagination Test',
      accessType: 'invite',
      maxMembers: 20,
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

    // Cria mais eventos passados do que o limite de paginação, todos com o membro
    // presente — isso é o que o ranking precisa continuar contando por inteiro.
    const now = Date.now()
    for (let i = 0; i < PAST_EVENTS_TO_CREATE; i++) {
      const startsAt = new Date(now - (i + 1) * 24 * 60 * 60 * 1000)
      const event = await prisma.event.create({
        data: {
          groupId,
          title: `Evento passado ${i}`,
          sport: 'football',
          startsAt,
          endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
          maxParticipants: 10,
          status: 'completed',
          createdBy: organizerId,
        },
      })
      eventIds.push(event.id)
      await prisma.eventParticipant.create({
        data: { eventId: event.id, userId: memberId, status: 'present', confirmedAt: startsAt },
      })
    }

    const detail = await groups.getDetail(groupId, organizerId)

    assert(
      detail.events.length <= 20 + 15,
      `lista de eventos deveria ser paginada (limite 20+15), veio ${detail.events.length}`,
    )
    assert(
      detail.events.length < PAST_EVENTS_TO_CREATE,
      'a paginação deveria trazer menos eventos do que o total criado no grupo',
    )

    const memberRanking = detail.ranking.find((r) => r.user_id === memberId)
    assert(memberRanking !== undefined, 'membro deveria aparecer no ranking')
    assert(
      memberRanking?.presences === PAST_EVENTS_TO_CREATE,
      `ranking deveria contar todas as ${PAST_EVENTS_TO_CREATE} presenças (histórico completo), veio ${memberRanking?.presences}`,
    )

    console.log(
      `✔ group-detail-pagination: eventos exibidos paginados (${detail.events.length} de ${PAST_EVENTS_TO_CREATE}), ranking com histórico completo (${memberRanking?.presences} presenças)`,
    )
  } finally {
    await prisma.eventParticipant.deleteMany({ where: { eventId: { in: eventIds } } })
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } })
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
