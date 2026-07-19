import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { SupabaseJwtGuard, SupabaseOptionalAuthGuard } from '../auth/supabase-jwt.guard'
import type { SupabaseUser } from '../auth/supabase-jwt.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { InvitesService } from './invites.service'

@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  // Guard opcional: bots de preview de link (WhatsApp/Telegram/etc) não têm
  // sessão, e precisam conseguir montar o Open Graph do convite mesmo assim.
  @UseGuards(SupabaseOptionalAuthGuard)
  @Get(':code')
  preview(@CurrentUser() user: SupabaseUser | undefined, @Param('code') code: string) {
    return this.invites.preview(code, user?.id)
  }

  @UseGuards(SupabaseJwtGuard)
  @Post(':code/redeem')
  redeem(@CurrentUser() user: SupabaseUser, @Param('code') code: string) {
    return this.invites.redeem(code, user.id)
  }
}
