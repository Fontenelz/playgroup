import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async home(userId: string) {
    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, nickname: true, avatarUrl: true },
    })
    if (!profile) return { profile: null }

    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, status: 'active' },
      select: { role: true, group: { select: { id: true, name: true, sport: true } } },
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

    const groups = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      sport: m.group.sport,
      member_count: memberCountMap.get(m.group.id) ?? 0,
      my_role: m.role,
    }))

    const [groupEventsRaw, standaloneEventsRaw] = await Promise.all([
      groupIds.length > 0
        ? this.prisma.event.findMany({
            where: { groupId: { in: groupIds }, startsAt: { gt: new Date() }, status: 'published' },
            orderBy: { startsAt: 'asc' },
            take: 5,
            select: {
              id: true,
              groupId: true,
              sport: true,
              startsAt: true,
              endsAt: true,
              maxParticipants: true,
              participantCount: true,
              group: { select: { name: true } },
              participants: { where: { userId }, select: { status: true }, take: 1 },
            },
          })
        : Promise.resolve([]),
      this.prisma.event.findMany({
        where: {
          groupId: null,
          startsAt: { gt: new Date() },
          status: 'published',
          OR: [
            { createdBy: userId },
            { participants: { some: { userId, status: { not: 'declined' } } } },
          ],
        },
        orderBy: { startsAt: 'asc' },
        take: 5,
        select: {
          id: true,
          sport: true,
          startsAt: true,
          endsAt: true,
          maxParticipants: true,
          participantCount: true,
          visibility: true,
          participants: { where: { userId }, select: { status: true }, take: 1 },
        },
      }),
    ])

    const groupEvents = groupEventsRaw.map((e) => ({
      id: e.id,
      group_id: e.groupId as string | null,
      sport: e.sport,
      starts_at: e.startsAt,
      ends_at: e.endsAt,
      max_participants: e.maxParticipants,
      participant_count: e.participantCount,
      my_status: e.participants[0]?.status ?? null,
      group_name: e.group?.name ?? null,
      visibility: null as 'link_only' | 'public' | null,
    }))

    const standaloneEvents = standaloneEventsRaw.map((e) => ({
      id: e.id,
      group_id: null as string | null,
      sport: e.sport,
      starts_at: e.startsAt,
      ends_at: e.endsAt,
      max_participants: e.maxParticipants,
      participant_count: e.participantCount,
      my_status: e.participants[0]?.status ?? null,
      group_name: null as string | null,
      visibility: e.visibility,
    }))

    const events = [...groupEvents, ...standaloneEvents]
      .sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime())
      .slice(0, 5)

    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })

    return {
      profile,
      groups,
      events,
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    }
  }

  async ranking(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, status: 'active' },
      select: { groupId: true },
    })
    const groupIds = memberships.map((m) => m.groupId)
    if (groupIds.length === 0) return { ranking: [] }

    const events = await this.prisma.event.findMany({
      where: { groupId: { in: groupIds }, startsAt: { lt: new Date() } },
      select: { id: true },
    })
    const eventIds = events.map((e) => e.id)
    if (eventIds.length === 0) return { ranking: [] }

    const presences = await this.prisma.eventParticipant.findMany({
      where: { eventId: { in: eventIds }, status: 'present' },
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

    const ranking = Array.from(rankingMap.entries())
      .map(([user_id, v]) => ({ user_id, ...v }))
      .sort((a, b) => b.presences - a.presences)

    return { ranking }
  }
}
