import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard'
import type { SupabaseUser } from '../auth/supabase-jwt.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { PaymentsService } from './payments.service'

@UseGuards(SupabaseJwtGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':paymentId/mark-paid')
  markPaid(
    @CurrentUser() user: SupabaseUser,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.payments.markPaid(paymentId, user.id)
  }
}
