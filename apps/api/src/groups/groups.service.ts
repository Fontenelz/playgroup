import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AuthzService } from '../common/authz.service'
import { PrismaService } from '../prisma/prisma.service'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function randomInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export interface CreateGroupDto {
  sport: string
  name: string
  description?: string
  accessType: 'public' | 'invite' | 'private'
  maxMembers: number
  monthlyFee?: number
  perEventFee?: number
  paymentDay?: number
}

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
  ) {}

  async listForUser(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, status: 'active', group: { deletedAt: null } },
      orderBy: { joinedAt: 'desc' },
      select: {
        role: true,
        memberType: true,
        group: { select: { id: true, name: true, sport: true, maxMembers: true } },
      },
    })

    const groupIds = memberships.map((m) => m.group.id)
    const memberCounts = groupIds.length
      ? await this.prisma.groupMember.groupBy({
          by: ['groupId'],
          where: { groupId: { in: groupIds }, status: 'active' },
          _count: { _all: true },
        })
      : []
    const memberCountMap = new Map(memberCounts.map((m) => [m.groupId, m._count._all]))

    return memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      sport: m.group.sport,
      max_members: m.group.maxMembers,
      member_count: memberCountMap.get(m.group.id) ?? 0,
      role: m.role,
    }))
  }

  async discoverPublic(userId: string, query: { page?: number; take?: number; sport?: string }) {
    const take = Math.min(Math.max(query.take ?? 20, 1), 50)
    const page = Math.max(query.page ?? 1, 1)
    const skip = (page - 1) * take

    const where = {
      accessType: 'public' as const,
      deletedAt: null,
      ...(query.sport ? { sport: query.sport } : {}),
    }

    const [groupsRaw, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          name: true,
          description: true,
          sport: true,
          maxMembers: true,
          members: {
            where: { userId, status: { in: ['active', 'pending'] } },
            select: { status: true },
            take: 1,
          },
        },
      }),
      this.prisma.group.count({ where }),
    ])

    const groupIds = groupsRaw.map((g) => g.id)
    const memberCounts = groupIds.length
      ? await this.prisma.groupMember.groupBy({
          by: ['groupId'],
          where: { groupId: { in: groupIds }, status: 'active' },
          _count: { _all: true },
        })
      : []
    const memberCountMap = new Map(memberCounts.map((m) => [m.groupId, m._count._all]))

    return {
      groups: groupsRaw.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        sport: g.sport,
        max_members: g.maxMembers,
        member_count: memberCountMap.get(g.id) ?? 0,
        my_status:
          g.members[0]?.status === 'active'
            ? 'active'
            : g.members[0]?.status === 'pending'
              ? 'pending'
              : 'none',
      })),
      total,
      page,
      take,
    }
  }

  async create(userId: string, dto: CreateGroupDto) {
    const slug = `${slugify(dto.name) || 'grupo'}-${Math.random().toString(36).slice(2, 7)}`

    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description || null,
        sport: dto.sport,
        adminId: userId,
        accessType: dto.accessType,
        maxMembers: dto.maxMembers,
        monthlyFee: dto.monthlyFee ?? null,
        perEventFee: dto.perEventFee ?? null,
        paymentDay: dto.paymentDay ?? null,
      },
    })

    await this.prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: 'admin',
        memberType: 'monthly',
        status: 'active',
      },
    })

    return { id: group.id }
  }

  async getDetail(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId, userId, status: 'active' },
      select: {
        role: true,
        memberType: true,
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            sport: true,
            monthlyFee: true,
            perEventFee: true,
            paymentDay: true,
            plan: true,
            adminId: true,
            accessType: true,
            maxMembers: true,
          },
        },
      },
    })
    if (!membership) throw new NotFoundException('Grupo não encontrado')

    const [eventsRaw, members, memberCount, pendingRaw] = await Promise.all([
      this.prisma.event.findMany({
        where: { groupId },
        orderBy: { startsAt: 'desc' },
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          locationName: true,
          maxParticipants: true,
          participantCount: true,
          notes: true,
          participants: {
            take: 20,
            orderBy: { confirmedAt: 'asc' },
            select: {
              userId: true,
              status: true,
              user: { select: { name: true, avatarUrl: true } },
            },
          },
        },
      }),
      this.prisma.groupMember.findMany({
        where: { groupId, status: 'active' },
        orderBy: { joinedAt: 'asc' },
        select: {
          id: true,
          role: true,
          memberType: true,
          skillRating: true,
          userId: true,
          user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
        },
      }),
      this.prisma.groupMember.count({ where: { groupId, status: 'active' } }),
      this.prisma.groupMember.findMany({
        where: { groupId, status: 'pending' },
        orderBy: { joinedAt: 'asc' },
        select: {
          id: true,
          role: true,
          memberType: true,
          skillRating: true,
          userId: true,
          user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
        },
      }),
    ])

    const events = eventsRaw.map((e) => ({
      id: e.id,
      title: e.title,
      starts_at: e.startsAt,
      ends_at: e.endsAt,
      location_name: e.locationName,
      max_participants: e.maxParticipants,
      participant_count: e.participantCount,
      notes: e.notes,
      my_status: e.participants.find((p) => p.userId === userId)?.status ?? null,
      confirmed_avatars: e.participants
        .filter((p) => p.status === 'confirmed')
        .slice(0, 4)
        .map((p) => ({ name: p.user.name, avatar_url: p.user.avatarUrl ?? undefined })),
    }))

    const pastEventIds = eventsRaw.filter((e) => e.startsAt < new Date()).map((e) => e.id)
    let ranking: { user_id: string; user: unknown; presences: number; last_presence_at: Date }[] =
      []
    const lastPresenceByUser = new Map<string, Date>()
    if (pastEventIds.length > 0) {
      const presences = await this.prisma.eventParticipant.findMany({
        where: { eventId: { in: pastEventIds }, status: 'present' },
        select: {
          userId: true,
          user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
          event: { select: { startsAt: true } },
        },
      })
      const rankingMap = new Map<
        string,
        { user: unknown; presences: number; lastPresenceAt: Date }
      >()
      for (const rec of presences) {
        const existing = rankingMap.get(rec.userId)
        if (existing) {
          existing.presences++
          if (rec.event.startsAt > existing.lastPresenceAt)
            existing.lastPresenceAt = rec.event.startsAt
        } else {
          rankingMap.set(rec.userId, {
            user: rec.user,
            presences: 1,
            lastPresenceAt: rec.event.startsAt,
          })
        }
      }
      for (const [userId, v] of rankingMap) lastPresenceByUser.set(userId, v.lastPresenceAt)
      ranking = Array.from(rankingMap.entries())
        .map(([user_id, v]) => ({
          user_id,
          user: v.user,
          presences: v.presences,
          last_presence_at: v.lastPresenceAt,
        }))
        .sort((a, b) => b.presences - a.presences)
    }

    const group = membership.group
    return {
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        sport: group.sport,
        monthly_fee: group.monthlyFee,
        per_event_fee: group.perEventFee,
        payment_day: group.paymentDay,
        plan: group.plan,
        admin_id: group.adminId,
        access_type: group.accessType,
        max_members: group.maxMembers,
      },
      myRole: membership.role,
      memberCount,
      events,
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        member_type: m.memberType,
        skill_rating: m.skillRating,
        user_id: m.userId,
        user: m.user,
        last_presence_at: lastPresenceByUser.get(m.userId) ?? null,
      })),
      pendingRequests: pendingRaw.map((m) => ({
        id: m.id,
        role: m.role,
        member_type: m.memberType,
        skill_rating: m.skillRating,
        user_id: m.userId,
        user: m.user,
        last_presence_at: null,
      })),
      ranking,
    }
  }

  async getPreview(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        description: true,
        sport: true,
        maxMembers: true,
        accessType: true,
        deletedAt: true,
      },
    })
    if (!group || group.deletedAt) throw new NotFoundException('Grupo não encontrado')

    const [membership, memberCount] = await Promise.all([
      this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
        select: { status: true },
      }),
      this.prisma.groupMember.count({ where: { groupId, status: 'active' } }),
    ])

    if (group.accessType !== 'public' && membership?.status !== 'active') {
      throw new NotFoundException('Grupo não encontrado')
    }

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      sport: group.sport,
      max_members: group.maxMembers,
      member_count: memberCount,
      access_type: group.accessType,
      my_status:
        membership?.status === 'active'
          ? 'active'
          : membership?.status === 'pending'
            ? 'pending'
            : 'none',
    }
  }

  async requestToJoin(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, deletedAt: true, accessType: true },
    })
    if (!group || group.deletedAt) throw new NotFoundException('Grupo não encontrado')
    if (group.accessType !== 'public') {
      throw new ForbiddenException(
        'Este grupo não aceita solicitações diretas — peça um convite ao organizador',
      )
    }

    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })
    if (existing?.status === 'active') return { status: 'active' }
    if (existing?.status === 'pending') return { status: 'pending' }
    if (existing?.status === 'banned') {
      throw new ForbiddenException('Você não pode solicitar entrada neste grupo')
    }

    await this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId, status: 'pending' },
      update: { status: 'pending' },
    })
    return { status: 'pending' }
  }

  async approveJoinRequest(groupId: string, targetUserId: string, actingUserId: string) {
    await this.authz.assertGroupOrganizer(groupId, actingUserId)

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    })
    if (!membership || membership.status !== 'pending') {
      throw new NotFoundException('Solicitação não encontrada')
    }

    await this.prisma.groupMember.update({
      where: { id: membership.id },
      data: { status: 'active', joinedAt: new Date() },
    })
    return { status: 'ok' }
  }

  async rejectJoinRequest(groupId: string, targetUserId: string, actingUserId: string) {
    await this.authz.assertGroupOrganizer(groupId, actingUserId)

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    })
    if (!membership || membership.status !== 'pending') {
      throw new NotFoundException('Solicitação não encontrada')
    }

    await this.prisma.groupMember.delete({ where: { id: membership.id } })
    return { status: 'ok' }
  }

  async removeMember(groupId: string, actingUserId: string, targetUserId: string) {
    await this.authz.assertGroupOrganizer(groupId, actingUserId)

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { adminId: true },
    })
    if (!group) throw new NotFoundException('Grupo não encontrado')
    if (group.adminId === targetUserId) {
      throw new ForbiddenException('Não é possível remover o dono do grupo')
    }

    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId, userId: targetUserId, status: 'active' },
    })
    if (!membership) throw new NotFoundException('Membro não encontrado')

    await this.prisma.groupMember.update({
      where: { id: membership.id },
      data: { status: 'banned' },
    })

    return { status: 'ok' }
  }

  async updateMemberRole(
    groupId: string,
    actingUserId: string,
    targetUserId: string,
    role: 'organizer' | 'participant',
  ) {
    await this.authz.assertGroupAdmin(groupId, actingUserId)

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { adminId: true },
    })
    if (!group) throw new NotFoundException('Grupo não encontrado')
    if (group.adminId === targetUserId) {
      throw new ForbiddenException('Não é possível alterar o papel do dono do grupo')
    }

    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId, userId: targetUserId, status: 'active' },
    })
    if (!membership) throw new NotFoundException('Membro não encontrado')

    await this.prisma.groupMember.update({
      where: { id: membership.id },
      data: { role },
    })

    return { status: 'ok' }
  }

  async getBasic(groupId: string, userId: string) {
    await this.authz.assertGroupMember(groupId, userId)
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, sport: true, perEventFee: true },
    })
    if (!group) throw new NotFoundException('Grupo não encontrado')
    return { id: group.id, name: group.name, sport: group.sport, per_event_fee: group.perEventFee }
  }

  async createInviteCode(groupId: string, userId: string) {
    await this.authz.assertGroupMember(groupId, userId)

    const existing = await this.prisma.inviteCode.findFirst({
      where: { groupId, createdBy: userId, expiresAt: null },
      orderBy: { createdAt: 'desc' },
    })
    if (existing) return { code: existing.code }

    const invite = await this.prisma.inviteCode.create({
      data: { groupId, code: randomInviteCode(), createdBy: userId },
    })
    return { code: invite.code }
  }
}
