import { ForbiddenException, NotFoundException } from '@nestjs/common'
import type { AuthzService } from '../common/authz.service'
import type { PrismaService } from '../prisma/prisma.service'
import { EventsService } from './events.service'

function buildPrismaMock() {
  return {
    event: { findUnique: jest.fn() },
    eventParticipant: { findMany: jest.fn() },
    payment: { upsert: jest.fn() },
  } as unknown as PrismaService & {
    event: { findUnique: jest.Mock }
    eventParticipant: { findMany: jest.Mock }
    payment: { upsert: jest.Mock }
  }
}

function buildAuthzMock() {
  return {
    assertGroupOrganizer: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuthzService & { assertGroupOrganizer: jest.Mock }
}

const baseParticipant = {
  id: 'participant-1',
  userId: 'user-1',
  isMonthly: false,
  user: { id: 'user-1', name: 'Fulano da Silva', nickname: null, avatarUrl: null },
}

describe('EventsService.financeData', () => {
  let prisma: ReturnType<typeof buildPrismaMock>
  let authz: ReturnType<typeof buildAuthzMock>
  let service: EventsService

  beforeEach(() => {
    prisma = buildPrismaMock()
    authz = buildAuthzMock()
    service = new EventsService(prisma, authz)
  })

  it('lança NotFoundException quando o evento não existe', async () => {
    prisma.event.findUnique.mockResolvedValue(null)
    await expect(service.financeData('event-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('lança NotFoundException para evento standalone (sem grupo/financeiro)', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'event-1',
      title: 'Pelada',
      eventFee: null,
      groupId: null,
      startsAt: new Date(),
      group: null,
    })
    await expect(service.financeData('event-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('propaga ForbiddenException quando o usuário não é organizador do grupo', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'event-1',
      title: 'Pelada',
      eventFee: null,
      groupId: 'group-1',
      startsAt: new Date(),
      group: { perEventFee: null },
    })
    authz.assertGroupOrganizer.mockRejectedValue(new ForbiddenException())
    await expect(service.financeData('event-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it('usa o eventFee específico do evento quando definido, ignorando o perEventFee do grupo', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'event-1',
      title: 'Pelada',
      eventFee: 25,
      groupId: 'group-1',
      startsAt: new Date('2026-08-01T20:00:00Z'),
      group: { perEventFee: 15 },
    })
    prisma.eventParticipant.findMany.mockResolvedValue([baseParticipant])
    prisma.payment.upsert.mockResolvedValue({
      id: 'payment-1',
      userId: 'user-1',
      status: 'pending',
    })

    const result = await service.financeData('event-1', 'user-1')

    expect(result.fee).toBe(25)
    expect(prisma.payment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ amount: 25, groupId: 'group-1', userId: 'user-1' }),
      }),
    )
    expect(result.participants[0]).toMatchObject({
      payment_id: 'payment-1',
      payment_status: 'pending',
    })
  })

  it('cai pro perEventFee do grupo quando o evento não tem eventFee próprio', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'event-1',
      title: 'Pelada',
      eventFee: null,
      groupId: 'group-1',
      startsAt: new Date(),
      group: { perEventFee: 15 },
    })
    prisma.eventParticipant.findMany.mockResolvedValue([baseParticipant])
    prisma.payment.upsert.mockResolvedValue({
      id: 'payment-1',
      userId: 'user-1',
      status: 'pending',
    })

    const result = await service.financeData('event-1', 'user-1')
    expect(result.fee).toBe(15)
  })

  it('não gera cobranças quando a taxa é zero, mesmo com participantes confirmados', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'event-1',
      title: 'Pelada',
      eventFee: null,
      groupId: 'group-1',
      startsAt: new Date(),
      group: { perEventFee: null },
    })
    prisma.eventParticipant.findMany.mockResolvedValue([baseParticipant])

    const result = await service.financeData('event-1', 'user-1')

    expect(result.fee).toBe(0)
    expect(prisma.payment.upsert).not.toHaveBeenCalled()
    expect(result.participants[0]).toMatchObject({ payment_id: null, payment_status: 'pending' })
  })

  it('deriva o nickname do primeiro nome quando o usuário não tem nickname', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'event-1',
      title: 'Pelada',
      eventFee: null,
      groupId: 'group-1',
      startsAt: new Date(),
      group: { perEventFee: null },
    })
    prisma.eventParticipant.findMany.mockResolvedValue([baseParticipant])

    const result = await service.financeData('event-1', 'user-1')
    expect(result.participants[0].nickname).toBe('Fulano')
  })
})
