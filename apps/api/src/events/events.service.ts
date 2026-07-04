import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuthzService } from '../common/authz.service'
import { SPORT_LABELS } from '../common/sports'
import type { Prisma } from '../../generated/prisma'

export interface CreateEventDto {
  date: string
  startTime: string
  endTime: string
  recurrence: 'none' | 'weekly' | 'biweekly' | 'monthly'
  weekDays: string[]
  seriesEnd: string
  locationName?: string
  locationAddress?: string
  maxParticipants: number
  monthlySlots: number
  monthlyConfirmHours: number
  eventFee?: string
  notes?: string
}

export interface CreateStandaloneEventDto {
  sport: string
  date: string
  startTime: string
  endTime: string
  locationName?: string
  locationAddress?: string
  maxParticipants: number
  visibility: 'link_only' | 'public'
  notes?: string
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
  ) {}

  async create(groupId: string, userId: string, input: CreateEventDto) {
    await this.authz.assertGroupOrganizer(groupId, userId)

    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { sport: true } })
    if (!group) throw new NotFoundException('Grupo não encontrado')

    const sportLabel = SPORT_LABELS[group.sport] ?? group.sport
    const startsAt = new Date(`${input.date}T${input.startTime}:00`)
    const endsAt = new Date(`${input.date}T${input.endTime}:00`)
    if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1)

    const dateLabel = startsAt.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    })
    const title = `${sportLabel} · ${dateLabel}`

    const isRecurring = input.recurrence !== 'none'
    let recurrenceRule: string | null = null
    if (isRecurring) {
      const freq = input.recurrence === 'biweekly' ? 'WEEKLY;INTERVAL=2' : input.recurrence.toUpperCase()
      const byday =
        (input.recurrence === 'weekly' || input.recurrence === 'biweekly') && input.weekDays.length
          ? `;BYDAY=${input.weekDays.join(',')}`
          : ''
      const until = input.seriesEnd ? `;UNTIL=${input.seriesEnd.replace(/-/g, '')}` : ''
      recurrenceRule = `FREQ=${freq}${byday}${until}`
    }

    let confirmDeadline: Date | null = null
    if (isRecurring && input.monthlySlots > 0 && input.monthlyConfirmHours > 0) {
      confirmDeadline = new Date(startsAt.getTime() - input.monthlyConfirmHours * 60 * 60 * 1000)
    }

    const fee = input.eventFee ? Number.parseFloat(input.eventFee) || null : null

    const event = await this.prisma.event.create({
      data: {
        groupId,
        title,
        sport: group.sport,
        startsAt,
        endsAt,
        locationName: input.locationName || null,
        locationAddress: input.locationAddress || null,
        maxParticipants: input.maxParticipants,
        monthlySlots: input.monthlySlots,
        status: 'published',
        isRecurring,
        recurrenceRule,
        monthlyConfirmDeadline: confirmDeadline,
        eventFee: fee,
        notes: input.notes || null,
        createdBy: userId,
      },
    })

    return { id: event.id }
  }

  async createStandalone(userId: string, input: CreateStandaloneEventDto) {
    const sportLabel = SPORT_LABELS[input.sport] ?? input.sport
    const startsAt = new Date(`${input.date}T${input.startTime}:00`)
    const endsAt = new Date(`${input.date}T${input.endTime}:00`)
    if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1)

    const dateLabel = startsAt.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    })
    const title = `${sportLabel} · ${dateLabel}`

    const event = await this.prisma.event.create({
      data: {
        groupId: null,
        visibility: input.visibility,
        title,
        sport: input.sport,
        startsAt,
        endsAt,
        locationName: input.locationName || null,
        locationAddress: input.locationAddress || null,
        maxParticipants: input.maxParticipants,
        status: 'published',
        notes: input.notes || null,
        createdBy: userId,
      },
    })

    return { id: event.id }
  }

  async detail(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } })
    if (!event) throw new NotFoundException('Evento não encontrado')

    let group: {
      id: string
      name: string
      sport: string
      per_event_fee: unknown
      my_role: string
    } | null = null

    if (event.groupId) {
      const membership = await this.prisma.groupMember.findFirst({
        where: { groupId: event.groupId, userId, status: 'active' },
        select: { role: true, group: { select: { id: true, name: true, sport: true, perEventFee: true } } },
      })
      if (!membership) throw new NotFoundException('Evento não encontrado')

      group = {
        id: membership.group.id,
        name: membership.group.name,
        sport: membership.group.sport,
        per_event_fee: membership.group.perEventFee,
        my_role: membership.role,
      }
    }

    const [participantsRaw, myParticipation] = await Promise.all([
      this.prisma.eventParticipant.findMany({
        where: { eventId, status: { in: ['confirmed', 'pending', 'present', 'absent', 'declined'] } },
        orderBy: { confirmedAt: 'asc' },
        select: {
          id: true,
          eventId: true,
          userId: true,
          status: true,
          isMonthly: true,
          confirmedAt: true,
          user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
        },
      }),
      this.prisma.eventParticipant.findFirst({ where: { eventId, userId }, select: { status: true } }),
    ])

    const toItem = (p: (typeof participantsRaw)[number]) => ({
      id: p.id,
      event_id: p.eventId,
      user_id: p.userId,
      user: p.user,
      status: p.status,
      is_monthly: p.isMonthly,
      confirmed_at: p.confirmedAt,
    })

    const participants = participantsRaw.filter((p) => p.status !== 'declined').map(toItem)
    const waitlist = participantsRaw.filter((p) => p.status === 'pending').map((p) => ({
      id: p.id,
      user_id: p.userId,
      user: p.user,
      confirmed_at: p.confirmedAt,
    }))
    const declinedParticipants = participantsRaw.filter((p) => p.status === 'declined').map(toItem)

    return {
      event: {
        id: event.id,
        title: event.title,
        sport: event.sport,
        starts_at: event.startsAt,
        ends_at: event.endsAt,
        location_name: event.locationName,
        location_address: event.locationAddress,
        max_participants: event.maxParticipants,
        monthly_slots: event.monthlySlots,
        participant_count: event.participantCount,
        status: event.status,
        event_fee: event.eventFee,
        notes: event.notes,
      },
      group,
      visibility: event.visibility,
      isOwner: event.createdBy === userId,
      participants,
      waitlist,
      declinedParticipants,
      myStatus: myParticipation?.status ?? null,
    }
  }

  async confirmParticipation(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, groupId: true, visibility: true, maxParticipants: true, participantCount: true },
    })
    if (!event) throw new NotFoundException('Evento não encontrado')

    if (event.groupId) {
      await this.authz.assertGroupMember(event.groupId, userId)
    }

    // Evento avulso público: nunca confirma automático, sempre exige aprovação do organizador.
    if (!event.groupId && event.visibility === 'public') {
      await this.upsertParticipant(eventId, userId, 'pending', null)
      return
    }

    const hasSpace = event.participantCount < event.maxParticipants
    const status = hasSpace ? 'confirmed' : 'pending'

    await this.upsertParticipant(eventId, userId, status, hasSpace ? new Date() : null)
  }

  async declineParticipation(eventId: string, userId: string) {
    await this.upsertParticipant(eventId, userId, 'declined', null)
  }

  async approveParticipant(eventId: string, participantUserId: string, actingUserId: string) {
    const event = await this.assertManageablePublicStandalone(eventId, actingUserId)
    await this.upsertParticipant(eventId, participantUserId, 'confirmed', new Date())
    return { id: event.id }
  }

  async rejectParticipant(eventId: string, participantUserId: string, actingUserId: string) {
    const event = await this.assertManageablePublicStandalone(eventId, actingUserId)
    await this.upsertParticipant(eventId, participantUserId, 'declined', null)
    return { id: event.id }
  }

  /** Aprovação manual só existe pra evento avulso — eventos de grupo confirmam por vaga/organizador. */
  private async assertManageablePublicStandalone(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, groupId: true, createdBy: true },
    })
    if (!event) throw new NotFoundException('Evento não encontrado')
    if (event.groupId) {
      throw new BadRequestException('Aprovação manual só se aplica a eventos avulsos públicos')
    }
    await this.authz.assertEventManager(event, userId)
    return event
  }

  private async upsertParticipant(
    eventId: string,
    userId: string,
    status: 'confirmed' | 'pending' | 'declined',
    confirmedAt: Date | null,
  ) {
    const before = await this.prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { status: true },
    })

    await this.prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status, confirmedAt },
      update: { status, confirmedAt },
    })

    await this.syncParticipantCount(eventId, before?.status ?? null, status)
  }

  /** Espelha o trigger trg_update_participant_count do schema original. */
  private async syncParticipantCount(
    eventId: string,
    previousStatus: string | null,
    newStatus: string,
  ) {
    if (previousStatus === newStatus) return
    if (newStatus === 'confirmed') {
      await this.prisma.event.update({ where: { id: eventId }, data: { participantCount: { increment: 1 } } })
    } else if (previousStatus === 'confirmed') {
      const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { participantCount: true } })
      if (event && event.participantCount > 0) {
        await this.prisma.event.update({ where: { id: eventId }, data: { participantCount: { decrement: 1 } } })
      }
    }
  }

  async financeData(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, eventFee: true, groupId: true, group: { select: { perEventFee: true } } },
    })
    if (!event) throw new NotFoundException('Evento não encontrado')
    if (!event.groupId) throw new NotFoundException('Este evento não possui financeiro')
    await this.authz.assertGroupOrganizer(event.groupId, userId)

    const participants = await this.prisma.eventParticipant.findMany({
      where: { eventId, status: { in: ['confirmed', 'present'] } },
      orderBy: { confirmedAt: 'asc' },
      select: {
        id: true,
        userId: true,
        isMonthly: true,
        user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
      },
    })

    return {
      eventTitle: event.title,
      fee: event.eventFee ?? event.group?.perEventFee ?? 0,
      participants: participants.map((p) => ({
        id: p.id,
        user_id: p.userId,
        name: p.user.name,
        nickname: p.user.nickname ?? p.user.name.split(' ')[0],
        avatar_url: p.user.avatarUrl ?? undefined,
        is_monthly: p.isMonthly,
      })),
    }
  }

  async drawData(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, groupId: true, createdBy: true },
    })
    if (!event) throw new NotFoundException('Evento não encontrado')
    await this.authz.assertEventManager(event, userId)

    const participants = await this.prisma.eventParticipant.findMany({
      where: { eventId, status: 'confirmed' },
      select: {
        userId: true,
        user: { select: { id: true, name: true, nickname: true, avatarUrl: true, skillLevel: true } },
      },
    })

    return {
      eventTitle: event.title,
      confirmedParticipants: participants.map((p) => ({
        user_id: p.userId,
        name: p.user.name,
        nickname: p.user.nickname ?? p.user.name.split(' ')[0],
        avatar_url: p.user.avatarUrl ?? undefined,
        skill_level: p.user.skillLevel,
      })),
    }
  }

  async discoverPublic(
    userId: string,
    query: { page?: number; take?: number; sport?: string },
  ) {
    const take = Math.min(Math.max(query.take ?? 20, 1), 50)
    const page = Math.max(query.page ?? 1, 1)
    const skip = (page - 1) * take

    const where: Prisma.EventWhereInput = {
      groupId: null,
      visibility: 'public',
      status: { in: ['published', 'open'] },
      startsAt: { gt: new Date() },
      ...(query.sport ? { sport: query.sport } : {}),
    }

    const [eventsRaw, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        take,
        skip,
        select: {
          id: true,
          title: true,
          sport: true,
          startsAt: true,
          endsAt: true,
          locationName: true,
          maxParticipants: true,
          participantCount: true,
          creator: { select: { name: true, nickname: true, avatarUrl: true } },
          participants: { where: { userId }, select: { status: true }, take: 1 },
        },
      }),
      this.prisma.event.count({ where }),
    ])

    return {
      events: eventsRaw.map((e) => ({
        id: e.id,
        title: e.title,
        sport: e.sport,
        starts_at: e.startsAt,
        ends_at: e.endsAt,
        location_name: e.locationName,
        max_participants: e.maxParticipants,
        participant_count: e.participantCount,
        creator: e.creator
          ? {
              name: e.creator.name,
              nickname: e.creator.nickname ?? e.creator.name.split(' ')[0],
              avatar_url: e.creator.avatarUrl ?? undefined,
            }
          : null,
        my_status: e.participants[0]?.status ?? null,
      })),
      total,
      page,
      take,
    }
  }
}
