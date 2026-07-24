import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '../../generated/prisma'
import { AuthzService } from '../common/authz.service'
import { SPORT_LABELS } from '../common/sports'
import { PrismaService } from '../prisma/prisma.service'

/** Janela pra confirmar uma vaga reservada da fila de espera antes de expirar e passar pro próximo. */
const WAITLIST_RESERVATION_MS = 30 * 60 * 1000

/** Todo horário de evento é tratado como horário de Brasília — o app ainda não opera em outro fuso. */
const BRAZIL_UTC_OFFSET = '-03:00'

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

  /** Compartilhado por `create` e `createStandalone` — evita duplicar o parsing de
   *  horário (com o rollover pra madrugada) nos dois métodos de criação de evento. */
  private buildEventTimes(
    date: string,
    startTime: string,
    endTime: string,
  ): { startsAt: Date; endsAt: Date } {
    const startsAt = new Date(`${date}T${startTime}:00${BRAZIL_UTC_OFFSET}`)
    const endsAt = new Date(`${date}T${endTime}:00${BRAZIL_UTC_OFFSET}`)
    if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1)
    return { startsAt, endsAt }
  }

  /** Compartilhado por `create` e `createStandalone` — título padrão "Esporte · dia da semana, dd/mm". */
  private buildEventTitle(sport: string, startsAt: Date): string {
    const sportLabel = SPORT_LABELS[sport] ?? sport
    const dateLabel = startsAt.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
    return `${sportLabel} · ${dateLabel}`
  }

  async create(groupId: string, userId: string, input: CreateEventDto) {
    await this.authz.assertGroupOrganizer(groupId, userId)

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { sport: true },
    })
    if (!group) throw new NotFoundException('Grupo não encontrado')

    const { startsAt, endsAt } = this.buildEventTimes(input.date, input.startTime, input.endTime)
    const title = this.buildEventTitle(group.sport, startsAt)

    const isRecurring = input.recurrence !== 'none'
    let recurrenceRule: string | null = null
    if (isRecurring) {
      const freq =
        input.recurrence === 'biweekly' ? 'WEEKLY;INTERVAL=2' : input.recurrence.toUpperCase()
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
    const { startsAt, endsAt } = this.buildEventTimes(input.date, input.startTime, input.endTime)
    const title = this.buildEventTitle(input.sport, startsAt)

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
    const eventKind = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { groupId: true },
    })
    if (!eventKind) throw new NotFoundException('Evento não encontrado')
    if (eventKind.groupId) {
      // Garante que reservas de fila vencidas já tenham liberado a vaga antes de montar a resposta.
      await this.sweepExpiredWaitlist(eventId)
      await this.sweepUnpaidConfirmations(eventId)
    }

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
        select: {
          role: true,
          group: { select: { id: true, name: true, sport: true, perEventFee: true } },
        },
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

    const [participantsRaw, myParticipation, waitlistRaw, myWaitlistEntry] = await Promise.all([
      this.prisma.eventParticipant.findMany({
        where: {
          eventId,
          status: { in: ['confirmed', 'pending', 'present', 'absent', 'declined'] },
        },
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
      this.prisma.eventParticipant.findFirst({
        where: { eventId, userId },
        select: { status: true },
      }),
      event.groupId
        ? this.prisma.waitlist.findMany({
            where: { eventId, status: { in: ['waiting', 'notified'] } },
            orderBy: { joinedAt: 'asc' },
            select: {
              id: true,
              userId: true,
              status: true,
              isMonthly: true,
              joinedAt: true,
              expiresAt: true,
              user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
            },
          })
        : Promise.resolve([]),
      event.groupId
        ? this.prisma.waitlist.findFirst({
            where: { eventId, userId, status: { in: ['waiting', 'notified'] } },
            select: { status: true, expiresAt: true },
          })
        : Promise.resolve(null),
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
    const declinedParticipants = participantsRaw.filter((p) => p.status === 'declined').map(toItem)

    // Eventos de grupo usam a fila de espera de verdade (tabela Waitlist); eventos
    // avulsos continuam usando EventParticipant.status = 'pending' como antes.
    const waitlist = event.groupId
      ? waitlistRaw.map((w) => ({
          id: w.id,
          user_id: w.userId,
          user: w.user,
          status: w.status,
          is_monthly: w.isMonthly,
          joined_at: w.joinedAt,
          expires_at: w.expiresAt,
        }))
      : participantsRaw
          .filter((p) => p.status === 'pending')
          .map((p) => ({
            id: p.id,
            user_id: p.userId,
            user: p.user,
            confirmed_at: p.confirmedAt,
          }))

    const myStatus = myParticipation?.status ?? (myWaitlistEntry ? 'waitlist' : null)
    const myWaitlist = myWaitlistEntry
      ? { status: myWaitlistEntry.status, expires_at: myWaitlistEntry.expiresAt }
      : null

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
      myStatus,
      myWaitlist,
    }
  }

  async confirmParticipation(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, groupId: true, visibility: true },
    })
    if (!event) throw new NotFoundException('Evento não encontrado')

    if (event.groupId) {
      await this.authz.assertGroupMember(event.groupId, userId)
      await this.confirmOrJoinWaitlist(eventId, userId)
      return
    }

    // Evento avulso público: nunca confirma automático, sempre exige aprovação do organizador.
    if (event.visibility === 'public') {
      await this.upsertParticipant(eventId, userId, 'pending', null)
      return
    }

    // upsertParticipant reserva a vaga atomicamente e rebaixa pra 'pending' se
    // não houver espaço — não precisa (nem deve) checar capacidade aqui antes.
    await this.upsertParticipant(eventId, userId, 'confirmed', new Date())
  }

  async declineParticipation(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { groupId: true },
    })
    if (!event) throw new NotFoundException('Evento não encontrado')

    const { previousStatus } = await this.upsertParticipant(eventId, userId, 'declined', null)

    // Só eventos de grupo usam a fila de espera de verdade (tabela Waitlist);
    // liberar uma vaga confirmada precisa avisar o próximo da fila.
    if (event.groupId && previousStatus === 'confirmed') {
      await this.promoteNextWaitlistEntry(eventId)
    }
  }

  /** Fila de espera (tabela Waitlist) — só para eventos de grupo. */
  async joinWaitlist(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { groupId: true },
    })
    if (!event) throw new NotFoundException('Evento não encontrado')
    if (!event.groupId) {
      throw new BadRequestException('Fila de espera só está disponível para eventos de grupo')
    }
    await this.authz.assertGroupMember(event.groupId, userId)
    await this.confirmOrJoinWaitlist(eventId, userId)
  }

  async leaveWaitlist(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { groupId: true },
    })
    if (!event) throw new NotFoundException('Evento não encontrado')
    if (!event.groupId) {
      throw new BadRequestException('Fila de espera só está disponível para eventos de grupo')
    }

    await this.sweepExpiredWaitlist(eventId)
    await this.sweepUnpaidConfirmations(eventId)

    const entry = await this.prisma.waitlist.findUnique({
      where: { eventId_userId: { eventId, userId } },
    })
    if (!entry || (entry.status !== 'waiting' && entry.status !== 'notified')) {
      throw new NotFoundException('Você não está na fila de espera deste evento')
    }

    await this.prisma.waitlist.update({ where: { id: entry.id }, data: { status: 'left' } })

    // Se a vaga já estava reservada (notified) pra essa pessoa, libera pro próximo da fila.
    if (entry.status === 'notified') {
      await this.releaseSlot(eventId)
      await this.promoteNextWaitlistEntry(eventId)
    }
  }

  async confirmWaitlistSpot(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { groupId: true },
    })
    if (!event) throw new NotFoundException('Evento não encontrado')
    if (!event.groupId) {
      throw new BadRequestException('Fila de espera só está disponível para eventos de grupo')
    }

    await this.sweepExpiredWaitlist(eventId)
    await this.sweepUnpaidConfirmations(eventId)

    const entry = await this.prisma.waitlist.findUnique({
      where: { eventId_userId: { eventId, userId } },
    })
    if (entry?.status !== 'notified') {
      throw new BadRequestException('Sua vaga expirou ou você não foi chamado para confirmar')
    }

    // participant_count já foi incrementado quando a vaga foi reservada
    // (promoteNextWaitlistEntry), então aqui só materializa o EventParticipant.
    await this.prisma.$transaction(async (tx) => {
      await tx.waitlist.update({ where: { id: entry.id }, data: { status: 'confirmed' } })
      await tx.eventParticipant.upsert({
        where: { eventId_userId: { eventId, userId } },
        create: { eventId, userId, status: 'confirmed', confirmedAt: new Date() },
        update: { status: 'confirmed', confirmedAt: new Date() },
      })
      await this.ensurePayment(eventId, userId, tx)
    })
  }

  /**
   * Confirma direto se há vaga, senão entra (ou permanece) na fila de espera. Idempotente.
   *
   * A decisão "há vaga?" e a reserva dela precisam acontecer na mesma instrução SQL
   * (ver `reserveSlot`) — checar `participantCount < maxParticipants` numa query e só
   * depois escrever, em passos separados, permite que duas chamadas concorrentes no
   * último lugar disponível leiam "tem vaga" antes de qualquer uma escrever, e as duas
   * confirmem, estourando `maxParticipants`.
   */
  private async confirmOrJoinWaitlist(eventId: string, userId: string) {
    await this.sweepExpiredWaitlist(eventId)
    await this.sweepUnpaidConfirmations(eventId)

    const [existingParticipant, existingWaitlist] = await Promise.all([
      this.prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId } },
        select: { status: true },
      }),
      this.prisma.waitlist.findUnique({
        where: { eventId_userId: { eventId, userId } },
        select: { status: true },
      }),
    ])

    if (existingParticipant?.status === 'confirmed') return
    if (existingWaitlist?.status === 'waiting' || existingWaitlist?.status === 'notified') return

    const confirmed = await this.prisma.$transaction(async (tx) => {
      if (!(await this.reserveSlot(eventId, tx))) return false
      await tx.eventParticipant.upsert({
        where: { eventId_userId: { eventId, userId } },
        create: { eventId, userId, status: 'confirmed', confirmedAt: new Date() },
        update: { status: 'confirmed', confirmedAt: new Date() },
      })
      await this.ensurePayment(eventId, userId, tx)
      return true
    })
    if (confirmed) return

    const position = await this.prisma.waitlist.count({
      where: { eventId, status: { in: ['waiting', 'notified'] } },
    })
    await this.prisma.waitlist.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, position: position + 1, status: 'waiting', joinedAt: new Date() },
      update: { position: position + 1, status: 'waiting', joinedAt: new Date(), expiresAt: null },
    })
  }

  /** Expira reservas (status notified) vencidas e repassa a vaga pro próximo da fila. */
  private async sweepExpiredWaitlist(eventId: string) {
    const expired = await this.prisma.waitlist.findMany({
      where: { eventId, status: 'notified', expiresAt: { lt: new Date() } },
      select: { id: true },
    })

    for (const entry of expired) {
      await this.prisma.waitlist.update({ where: { id: entry.id }, data: { status: 'expired' } })
      await this.releaseSlot(eventId)
      await this.promoteNextWaitlistEntry(eventId)
    }
  }

  /**
   * Reverte pra pendente quem confirmou mas não é mensalista e não pagou até o
   * prazo configurado no grupo (Group.paymentDeadlineHours, opt-in — grupo sem
   * esse campo ou sem cobrança por evento não é afetado). A vaga liberada é
   * repassada pro próximo da fila de espera, igual a uma recusa.
   */
  private async sweepUnpaidConfirmations(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        groupId: true,
        startsAt: true,
        eventFee: true,
        group: { select: { paymentDeadlineHours: true, perEventFee: true } },
      },
    })
    if (!event?.groupId || !event.group?.paymentDeadlineHours) return

    const fee = Number(event.eventFee ?? event.group.perEventFee ?? 0)
    if (fee <= 0) return

    const deadline = new Date(
      event.startsAt.getTime() - event.group.paymentDeadlineHours * 60 * 60 * 1000,
    )
    if (deadline > new Date()) return

    const confirmed = await this.prisma.eventParticipant.findMany({
      where: { eventId, status: 'confirmed' },
      select: { userId: true },
    })
    if (confirmed.length === 0) return

    const userIds = confirmed.map((p) => p.userId)
    const [members, paidPayments] = await Promise.all([
      this.prisma.groupMember.findMany({
        where: { groupId: event.groupId, userId: { in: userIds }, status: 'active' },
        select: { userId: true, memberType: true },
      }),
      this.prisma.payment.findMany({
        where: { eventId, userId: { in: userIds }, status: 'paid' },
        select: { userId: true },
      }),
    ])
    const memberTypeByUser = new Map(members.map((m) => [m.userId, m.memberType]))
    const paidUserIds = new Set(paidPayments.map((p) => p.userId))

    for (const userId of userIds) {
      if (memberTypeByUser.get(userId) === 'monthly') continue
      if (paidUserIds.has(userId)) continue

      await this.upsertParticipant(eventId, userId, 'pending', null)
      await this.prisma.payment.updateMany({
        where: { eventId, userId, status: { not: 'paid' } },
        data: { status: 'overdue' },
      })
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'payment_deadline_missed',
          title: 'Vaga liberada por falta de pagamento',
          body: 'Sua confirmação foi movida pra pendente porque o pagamento não foi identificado até o prazo.',
          data: { eventId },
        },
      })
      await this.promoteNextWaitlistEntry(eventId)
    }
  }

  /** Se há vaga livre, reserva (status notified, 30min) pro primeiro da fila e notifica. */
  private async promoteNextWaitlistEntry(eventId: string) {
    const next = await this.prisma.waitlist.findFirst({
      where: { eventId, status: 'waiting' },
      orderBy: { joinedAt: 'asc' },
    })
    if (!next) return

    const promoted = await this.prisma.$transaction(async (tx) => {
      if (!(await this.reserveSlot(eventId, tx))) return false
      const expiresAt = new Date(Date.now() + WAITLIST_RESERVATION_MS)
      await tx.waitlist.update({ where: { id: next.id }, data: { status: 'notified', expiresAt } })
      return true
    })
    if (!promoted) return

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true },
    })
    await this.prisma.notification.create({
      data: {
        userId: next.userId,
        type: 'waitlist_called',
        title: 'Vaga disponível! 🎉',
        body: `Uma vaga abriu em "${event?.title ?? ''}". Confirme em até 30 minutos.`,
        data: { eventId },
      },
    })
  }

  /**
   * Reserva 1 vaga atomicamente (incremento e checagem de capacidade na mesma
   * instrução SQL) — ver o comentário em `confirmOrJoinWaitlist` sobre por que
   * "ler e depois escrever" em passos separados permite estourar `maxParticipants`.
   */
  private async reserveSlot(
    eventId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<boolean> {
    const affected = await client.$executeRaw`
      UPDATE events SET participant_count = participant_count + 1
      WHERE id = ${eventId}::uuid AND participant_count < max_participants
    `
    return affected > 0
  }

  private async releaseSlot(
    eventId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await client.$executeRaw`
      UPDATE events SET participant_count = GREATEST(participant_count - 1, 0) WHERE id = ${eventId}::uuid
    `
  }

  /**
   * Garante a cobrança (Payment) no momento em que a participação num evento de
   * grupo é confirmada — não mais em `financeData`/`GET /finance`, que agora é
   * só leitura (uma requisição GET não deveria ter efeito de escrita). Idempotente
   * via a unique constraint em [eventId, userId]; sem custo (fee <= 0) não cria nada.
   */
  private async ensurePayment(
    eventId: string,
    userId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const event = await client.event.findUnique({
      where: { id: eventId },
      select: {
        groupId: true,
        eventFee: true,
        startsAt: true,
        group: { select: { perEventFee: true } },
      },
    })
    if (!event?.groupId) return

    const fee = Number(event.eventFee ?? event.group?.perEventFee ?? 0)
    if (fee <= 0) return

    await client.payment.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: {
        groupId: event.groupId,
        userId,
        eventId,
        type: 'per_event',
        amount: fee,
        dueDate: event.startsAt,
      },
      update: {},
    })
  }

  async approveParticipant(eventId: string, participantUserId: string, actingUserId: string) {
    const event = await this.assertManageablePublicStandalone(eventId, actingUserId)
    const { finalStatus } = await this.upsertParticipant(
      eventId,
      participantUserId,
      'confirmed',
      new Date(),
    )
    if (finalStatus !== 'confirmed') {
      throw new BadRequestException('Evento lotado — não é possível aprovar mais participantes')
    }
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

  /**
   * Grava o status do participante e mantém `participant_count` em sincronia — espelha
   * o trigger `trg_update_participant_count` do schema original, mas via `reserveSlot`/
   * `releaseSlot` (atômicos) em vez de ler-e-depois-escrever, e tudo numa `$transaction`
   * pra não deixar o contador incrementado sem o `EventParticipant` correspondente (ou
   * vice-versa) se algo falhar no meio.
   *
   * Se `status` pedido for 'confirmed' mas não houver vaga, a transação rebaixa
   * automaticamente pra 'pending' — `finalStatus` no retorno diz o que de fato aconteceu.
   */
  private async upsertParticipant(
    eventId: string,
    userId: string,
    status: 'confirmed' | 'pending' | 'declined',
    confirmedAt: Date | null,
  ): Promise<{ previousStatus: string | null; finalStatus: 'confirmed' | 'pending' | 'declined' }> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId } },
        select: { status: true },
      })
      const previousStatus = before?.status ?? null

      let finalStatus = status
      let finalConfirmedAt = confirmedAt
      if (status === 'confirmed' && previousStatus !== 'confirmed') {
        if (!(await this.reserveSlot(eventId, tx))) {
          finalStatus = 'pending'
          finalConfirmedAt = null
        }
      } else if (status !== 'confirmed' && previousStatus === 'confirmed') {
        await this.releaseSlot(eventId, tx)
      }

      await tx.eventParticipant.upsert({
        where: { eventId_userId: { eventId, userId } },
        create: { eventId, userId, status: finalStatus, confirmedAt: finalConfirmedAt },
        update: { status: finalStatus, confirmedAt: finalConfirmedAt },
      })

      return { previousStatus, finalStatus }
    })
  }

  async financeData(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        eventFee: true,
        groupId: true,
        group: { select: { perEventFee: true } },
      },
    })
    if (!event) throw new NotFoundException('Evento não encontrado')
    if (!event.groupId) throw new NotFoundException('Este evento não possui financeiro')
    await this.authz.assertGroupOrganizer(event.groupId, userId)
    await this.sweepUnpaidConfirmations(eventId)

    const fee = Number(event.eventFee ?? event.group?.perEventFee ?? 0)

    // Leitura pura — a cobrança (Payment) já foi criada no momento em que a
    // participação foi confirmada (ver `ensurePayment`), não mais aqui.
    const [participants, payments] = await Promise.all([
      this.prisma.eventParticipant.findMany({
        where: { eventId, status: { in: ['confirmed', 'present'] } },
        orderBy: { confirmedAt: 'asc' },
        select: {
          id: true,
          userId: true,
          isMonthly: true,
          user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: { eventId },
        select: { id: true, userId: true, status: true },
      }),
    ])
    const paymentByUser = new Map(payments.map((p) => [p.userId, p]))

    return {
      eventTitle: event.title,
      fee,
      participants: participants.map((p) => {
        const payment = paymentByUser.get(p.userId)
        return {
          id: p.id,
          user_id: p.userId,
          name: p.user.name,
          nickname: p.user.nickname ?? p.user.name.split(' ')[0],
          avatar_url: p.user.avatarUrl ?? undefined,
          is_monthly: p.isMonthly,
          payment_id: payment?.id ?? null,
          payment_status: payment?.status ?? 'pending',
        }
      }),
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
        user: {
          select: { id: true, name: true, nickname: true, avatarUrl: true, skillLevel: true },
        },
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

  /** Todos os eventos (de grupo + avulsos) em que o usuário participa ou que criou, sem limite —
   *  diferente do preview de 5 itens do dashboard (`DashboardService.home`). */
  async myEvents(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, status: 'active' },
      select: { groupId: true },
    })
    const groupIds = memberships.map((m) => m.groupId)

    const [groupEventsRaw, standaloneEventsRaw] = await Promise.all([
      groupIds.length > 0
        ? this.prisma.event.findMany({
            where: {
              groupId: { in: groupIds },
              status: 'published',
              participants: { some: { userId } },
            },
            orderBy: { startsAt: 'desc' },
            select: {
              id: true,
              groupId: true,
              title: true,
              sport: true,
              startsAt: true,
              endsAt: true,
              locationName: true,
              locationAddress: true,
              maxParticipants: true,
              participantCount: true,
              eventFee: true,
              group: { select: { name: true } },
              participants: { where: { userId }, select: { status: true }, take: 1 },
            },
          })
        : Promise.resolve([]),
      this.prisma.event.findMany({
        where: {
          groupId: null,
          status: { in: ['published', 'open'] },
          OR: [{ createdBy: userId }, { participants: { some: { userId } } }],
        },
        orderBy: { startsAt: 'desc' },
        select: {
          id: true,
          title: true,
          sport: true,
          startsAt: true,
          endsAt: true,
          locationName: true,
          locationAddress: true,
          maxParticipants: true,
          participantCount: true,
          eventFee: true,
          participants: { where: { userId }, select: { status: true }, take: 1 },
        },
      }),
    ])

    const events = [
      ...groupEventsRaw.map((e) => ({
        id: e.id,
        group_id: e.groupId,
        title: e.title,
        sport: e.sport,
        starts_at: e.startsAt,
        ends_at: e.endsAt,
        location_name: e.locationName,
        location_address: e.locationAddress,
        max_participants: e.maxParticipants,
        participant_count: e.participantCount,
        event_fee: e.eventFee ? Number(e.eventFee) : null,
        group_name: e.group?.name ?? null,
        my_status: e.participants[0]?.status ?? null,
      })),
      ...standaloneEventsRaw.map((e) => ({
        id: e.id,
        group_id: null as string | null,
        title: e.title,
        sport: e.sport,
        starts_at: e.startsAt,
        ends_at: e.endsAt,
        location_name: e.locationName,
        location_address: e.locationAddress,
        max_participants: e.maxParticipants,
        participant_count: e.participantCount,
        event_fee: e.eventFee ? Number(e.eventFee) : null,
        group_name: null as string | null,
        my_status: e.participants[0]?.status ?? null,
      })),
    ].sort((a, b) => b.starts_at.getTime() - a.starts_at.getTime())

    return { events }
  }

  async discoverPublic(userId: string, query: { page?: number; take?: number; sport?: string }) {
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
