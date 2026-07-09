import { Injectable, NotFoundException } from '@nestjs/common'
import { AuthzService } from '../common/authz.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
  ) {}

  async markPaid(paymentId: string, actingUserId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } })
    if (!payment) throw new NotFoundException('Cobrança não encontrada')

    await this.authz.assertGroupOrganizer(payment.groupId, actingUserId)

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'paid', paidAt: new Date(), paidBy: actingUserId },
    })
  }
}
