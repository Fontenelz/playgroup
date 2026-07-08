import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { PrismaService } from '../prisma/prisma.service'

/**
 * Reimplementação, em código, das policies de RLS do schema Supabase original
 * (supabase/migrations/001_initial_schema.sql). A autorização real agora vive
 * aqui em vez de no Postgres, já que o Postgres local não sabe quem é o
 * usuário autenticado (isso vem do JWT verificado em SupabaseJwtGuard).
 */
@Injectable()
export class AuthzService {
  constructor(private readonly prisma: PrismaService) {}

  async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId, userId, status: 'active' },
      select: { id: true },
    })
    return membership !== null
  }

  async isGroupOrganizer(groupId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId, userId, status: 'active', role: { in: ['admin', 'organizer'] } },
      select: { id: true },
    })
    return membership !== null
  }

  async isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { adminId: true },
    })
    return group?.adminId === userId
  }

  async assertGroupMember(groupId: string, userId: string): Promise<void> {
    if (!(await this.isGroupMember(groupId, userId))) {
      throw new ForbiddenException('Você não é membro deste grupo')
    }
  }

  async assertGroupOrganizer(groupId: string, userId: string): Promise<void> {
    if (!(await this.isGroupOrganizer(groupId, userId))) {
      throw new ForbiddenException('Requer papel de admin ou organizador no grupo')
    }
  }

  async assertGroupAdmin(groupId: string, userId: string): Promise<void> {
    if (!(await this.isGroupAdmin(groupId, userId))) {
      throw new ForbiddenException('Requer ser admin do grupo')
    }
  }

  /** Busca o group_id de um evento ou lança 404 — usado antes das checagens acima. */
  async groupIdForEvent(eventId: string): Promise<string | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { groupId: true },
    })
    if (!event) throw new NotFoundException('Evento não encontrado')
    return event.groupId
  }

  /**
   * Checagem agnóstica de grupo: eventos de grupo são geridos por
   * organizadores do grupo; eventos avulsos (sem grupo) são geridos só por
   * quem criou (não há grupo pra herdar permissão).
   */
  async isEventManager(
    event: { groupId: string | null; createdBy: string | null },
    userId: string,
  ): Promise<boolean> {
    if (event.groupId) return this.isGroupOrganizer(event.groupId, userId)
    return event.createdBy === userId
  }

  async assertEventManager(
    event: { groupId: string | null; createdBy: string | null },
    userId: string,
  ): Promise<void> {
    if (!(await this.isEventManager(event, userId))) {
      throw new ForbiddenException('Você não tem permissão para gerenciar este evento')
    }
  }
}
