import { ForbiddenException, NotFoundException } from '@nestjs/common'
import type { PrismaService } from '../prisma/prisma.service'
import { AuthzService } from './authz.service'

function buildPrismaMock() {
  return {
    groupMember: { findFirst: jest.fn() },
    group: { findUnique: jest.fn() },
    event: { findUnique: jest.fn() },
  } as unknown as PrismaService & {
    groupMember: { findFirst: jest.Mock }
    group: { findUnique: jest.Mock }
    event: { findUnique: jest.Mock }
  }
}

describe('AuthzService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>
  let authz: AuthzService

  beforeEach(() => {
    prisma = buildPrismaMock()
    authz = new AuthzService(prisma)
  })

  describe('isGroupMember', () => {
    it('retorna true quando existe membership ativa', async () => {
      prisma.groupMember.findFirst.mockResolvedValue({ id: 'membership-1' })
      await expect(authz.isGroupMember('group-1', 'user-1')).resolves.toBe(true)
      expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
        where: { groupId: 'group-1', userId: 'user-1', status: 'active' },
        select: { id: true },
      })
    })

    it('retorna false quando não há membership ativa', async () => {
      prisma.groupMember.findFirst.mockResolvedValue(null)
      await expect(authz.isGroupMember('group-1', 'user-1')).resolves.toBe(false)
    })
  })

  describe('assertGroupMember', () => {
    it('não lança quando é membro', async () => {
      prisma.groupMember.findFirst.mockResolvedValue({ id: 'membership-1' })
      await expect(authz.assertGroupMember('group-1', 'user-1')).resolves.toBeUndefined()
    })

    it('lança ForbiddenException quando não é membro', async () => {
      prisma.groupMember.findFirst.mockResolvedValue(null)
      await expect(authz.assertGroupMember('group-1', 'user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      )
    })
  })

  describe('assertGroupOrganizer', () => {
    it('permite admin ou organizer', async () => {
      prisma.groupMember.findFirst.mockResolvedValue({ id: 'membership-1' })
      await expect(authz.assertGroupOrganizer('group-1', 'user-1')).resolves.toBeUndefined()
      expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
        where: {
          groupId: 'group-1',
          userId: 'user-1',
          status: 'active',
          role: { in: ['admin', 'organizer'] },
        },
        select: { id: true },
      })
    })

    it('rejeita participante comum', async () => {
      prisma.groupMember.findFirst.mockResolvedValue(null)
      await expect(authz.assertGroupOrganizer('group-1', 'user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      )
    })
  })

  describe('assertGroupAdmin', () => {
    it('permite só o admin do grupo (Group.adminId)', async () => {
      prisma.group.findUnique.mockResolvedValue({ adminId: 'user-1' })
      await expect(authz.assertGroupAdmin('group-1', 'user-1')).resolves.toBeUndefined()
    })

    it('rejeita organizer que não é o admin', async () => {
      prisma.group.findUnique.mockResolvedValue({ adminId: 'outro-user' })
      await expect(authz.assertGroupAdmin('group-1', 'user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      )
    })

    it('rejeita quando o grupo não existe', async () => {
      prisma.group.findUnique.mockResolvedValue(null)
      await expect(authz.assertGroupAdmin('group-1', 'user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      )
    })
  })

  describe('groupIdForEvent', () => {
    it('retorna o groupId do evento', async () => {
      prisma.event.findUnique.mockResolvedValue({ groupId: 'group-1' })
      await expect(authz.groupIdForEvent('event-1')).resolves.toBe('group-1')
    })

    it('retorna null para evento standalone', async () => {
      prisma.event.findUnique.mockResolvedValue({ groupId: null })
      await expect(authz.groupIdForEvent('event-1')).resolves.toBeNull()
    })

    it('lança NotFoundException quando o evento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null)
      await expect(authz.groupIdForEvent('event-1')).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('isEventManager / assertEventManager', () => {
    it('evento de grupo: delega para isGroupOrganizer', async () => {
      prisma.groupMember.findFirst.mockResolvedValue({ id: 'membership-1' })
      const event = { groupId: 'group-1', createdBy: 'outro-user' }
      await expect(authz.isEventManager(event, 'user-1')).resolves.toBe(true)
      expect(prisma.groupMember.findFirst).toHaveBeenCalled()
    })

    it('evento standalone: só o criador gerencia', async () => {
      const event = { groupId: null, createdBy: 'user-1' }
      await expect(authz.isEventManager(event, 'user-1')).resolves.toBe(true)
      await expect(authz.isEventManager(event, 'outro-user')).resolves.toBe(false)
      expect(prisma.groupMember.findFirst).not.toHaveBeenCalled()
    })

    it('assertEventManager lança ForbiddenException para não-gerente de evento standalone', async () => {
      const event = { groupId: null, createdBy: 'user-1' }
      await expect(authz.assertEventManager(event, 'outro-user')).rejects.toBeInstanceOf(
        ForbiddenException,
      )
    })
  })
})
