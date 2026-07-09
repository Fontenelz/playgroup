import { BadRequestException, Injectable } from '@nestjs/common'
import { AuthzService } from '../common/authz.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
  ) {}

  async preview(code: string, userId: string) {
    const invite = await this.prisma.inviteCode.findUnique({ where: { code } })

    const invalid =
      !invite ||
      (invite.expiresAt !== null && invite.expiresAt < new Date()) ||
      (invite.maxUses !== null && invite.uses >= invite.maxUses)

    if (invalid) {
      return { is_valid: false }
    }

    const group = await this.prisma.group.findFirst({
      where: { id: invite.groupId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        sport: true,
        accessType: true,
        monthlyFee: true,
        perEventFee: true,
        paymentDay: true,
      },
    })
    if (!group) return { is_valid: false }

    const [memberCount, isMember, members] = await Promise.all([
      this.prisma.groupMember.count({ where: { groupId: group.id, status: 'active' } }),
      this.authz.isGroupMember(group.id, userId),
      this.prisma.groupMember.findMany({
        where: { groupId: group.id, status: 'active' },
        orderBy: { joinedAt: 'asc' },
        take: 8,
        select: {
          id: true,
          role: true,
          userId: true,
          user: { select: { name: true, nickname: true, avatarUrl: true } },
        },
      }),
    ])

    return {
      is_valid: true,
      group_id: group.id,
      group_name: group.name,
      description: group.description,
      sport: group.sport,
      access_type: group.accessType,
      monthly_fee: group.monthlyFee,
      per_event_fee: group.perEventFee,
      payment_day: group.paymentDay,
      member_count: memberCount,
      is_member: isMember,
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        user: {
          id: m.userId,
          name: m.user.name,
          nickname: m.user.nickname,
          avatar_url: m.user.avatarUrl,
        },
      })),
    }
  }

  async redeem(code: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.inviteCode.findUnique({ where: { code } })
      if (!invite) throw new BadRequestException('Código de convite inválido')
      if (invite.expiresAt !== null && invite.expiresAt < new Date()) {
        throw new BadRequestException('Este convite expirou')
      }
      if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
        throw new BadRequestException('Este convite atingiu o limite de usos')
      }

      const existing = await tx.groupMember.findFirst({
        where: { groupId: invite.groupId, userId },
      })
      if (existing) throw new BadRequestException('Você já é membro deste grupo')

      await tx.groupMember.create({
        data: {
          groupId: invite.groupId,
          userId,
          role: 'participant',
          memberType: 'regular',
          status: 'active',
        },
      })
      await tx.inviteCode.update({ where: { id: invite.id }, data: { uses: { increment: 1 } } })

      return { groupId: invite.groupId }
    })
  }
}
