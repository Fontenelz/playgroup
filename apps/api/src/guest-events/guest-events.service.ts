import { BadRequestException, Injectable } from '@nestjs/common'
import { AuthzService } from '../common/authz.service'
import { PrismaService } from '../prisma/prisma.service'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

@Injectable()
export class GuestEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
  ) {}

  async preview(eventId: string, userId: string | undefined) {
    if (!UUID_RE.test(eventId)) return { status_code: 'not_found' as const }

    const event = await this.prisma.event.findUnique({ where: { id: eventId } })
    if (!event) return { status_code: 'not_found' as const }

    let groupId: string | null = null
    let groupName: string | null = null

    if (event.groupId) {
      const group = await this.prisma.group.findUnique({ where: { id: event.groupId } })
      if (!group || group.deletedAt !== null || group.accessType === 'private') {
        return { status_code: 'private' as const }
      }
      groupId = group.id
      groupName = group.name
    } else if (event.visibility === 'public' && !userId) {
      // Evento avulso público: precisa estar logado pra ver detalhes (não é anônimo/link-only).
      return { status_code: 'auth_required' as const }
    }

    if (!['published', 'open'].includes(event.status)) {
      return { status_code: 'closed' as const }
    }

    let nickname: string | null = null
    let myStatus: string | null = null
    let isMember = false
    if (userId) {
      const [user, participation, member] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } }),
        this.prisma.eventParticipant.findUnique({
          where: { eventId_userId: { eventId, userId } },
          select: { status: true },
        }),
        groupId ? this.authz.isGroupMember(groupId, userId) : Promise.resolve(false),
      ])
      nickname = user?.nickname ?? null
      myStatus = participation?.status ?? null
      isMember = member
    }

    return {
      status_code: 'ok' as const,
      event_id: event.id,
      group_id: groupId,
      title: event.title,
      sport: event.sport,
      starts_at: event.startsAt,
      ends_at: event.endsAt,
      location_name: event.locationName,
      max_participants: event.maxParticipants,
      participant_count: event.participantCount,
      group_name: groupName,
      visibility: event.visibility,
      is_owner: event.createdBy === userId,
      my_status: myStatus,
      is_member: isMember,
      has_profile: nickname !== null,
      profile_nickname: nickname,
    }
  }

  async confirmAsGuest(eventId: string, userId: string, name: string | undefined) {
    if (!UUID_RE.test(eventId)) throw new BadRequestException('Evento não encontrado')

    const event = await this.prisma.event.findUnique({ where: { id: eventId } })
    if (!event) throw new BadRequestException('Evento não encontrado')

    if (event.groupId) {
      const group = await this.prisma.group.findUnique({ where: { id: event.groupId } })
      if (!group || group.deletedAt !== null || group.accessType === 'private') {
        throw new BadRequestException('Este evento é privado')
      }
    }
    if (!['published', 'open'].includes(event.status)) {
      throw new BadRequestException('Este evento não está mais aceitando confirmações')
    }

    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } })
    const isPublicStandalone = !event.groupId && event.visibility === 'public'

    if (isPublicStandalone && (!existingUser || existingUser.isGuest)) {
      throw new BadRequestException('Entre com sua conta para participar deste evento')
    }

    let status: 'confirmed' | 'pending'

    if (!existingUser) {
      const trimmedName = name?.trim()
      if (!trimmedName) throw new BadRequestException('Informe seu nome')
      await this.prisma.user.create({
        data: {
          id: userId,
          name: trimmedName,
          nickname: trimmedName.split(' ')[0],
          isGuest: true,
        },
      })
      status = 'pending'
    } else if (isPublicStandalone) {
      // Evento avulso público: nunca confirma automático, sempre exige aprovação do organizador.
      status = 'pending'
    } else {
      status = event.participantCount < event.maxParticipants ? 'confirmed' : 'pending'
    }

    const before = await this.prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { status: true },
    })

    await this.prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status, confirmedAt: status === 'confirmed' ? new Date() : null },
      update: { status, confirmedAt: status === 'confirmed' ? new Date() : null },
    })

    if (before?.status !== 'confirmed' && status === 'confirmed') {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { participantCount: { increment: 1 } },
      })
    }

    // Retornar um objeto (não a string pura) — Nest/Express só serializa em
    // JSON corpos de resposta que são objeto/array; string pura vira texto
    // cru sem aspas, quebrando o `res.json()` do lado do cliente.
    return { status }
  }
}
