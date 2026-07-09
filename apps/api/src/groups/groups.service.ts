import { Injectable, NotFoundException } from '@nestjs/common'
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

    return memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      sport: m.group.sport,
      max_members: m.group.maxMembers,
      role: m.role,
    }))
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

    const [eventsRaw, members, memberCount] = await Promise.all([
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
          participants: { where: { userId }, select: { status: true }, take: 1 },
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
      my_status: e.participants[0]?.status ?? null,
    }))

    const pastEventIds = eventsRaw.filter((e) => e.startsAt < new Date()).map((e) => e.id)
    let ranking: { user_id: string; user: unknown; presences: number }[] = []
    if (pastEventIds.length > 0) {
      const presences = await this.prisma.eventParticipant.findMany({
        where: { eventId: { in: pastEventIds }, status: 'present' },
        select: {
          userId: true,
          user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
        },
      })
      const rankingMap = new Map<string, { user: unknown; presences: number }>()
      for (const rec of presences) {
        const existing = rankingMap.get(rec.userId)
        if (existing) existing.presences++
        else rankingMap.set(rec.userId, { user: rec.user, presences: 1 })
      }
      ranking = Array.from(rankingMap.entries())
        .map(([user_id, v]) => ({ user_id, ...v }))
        .sort((a, b) => b.presences - a.presences)
    }

    return {
      group: membership.group,
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
      })),
      ranking,
    }
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
