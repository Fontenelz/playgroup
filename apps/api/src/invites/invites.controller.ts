import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard'
import type { SupabaseUser } from '../auth/supabase-jwt.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { InvitesService } from './invites.service'

@UseGuards(SupabaseJwtGuard)
@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Get(':code')
  preview(@CurrentUser() user: SupabaseUser, @Param('code') code: string) {
    return this.invites.preview(code, user.id)
  }

  @Post(':code/redeem')
  redeem(@CurrentUser() user: SupabaseUser, @Param('code') code: string) {
    return this.invites.redeem(code, user.id)
  }
}
