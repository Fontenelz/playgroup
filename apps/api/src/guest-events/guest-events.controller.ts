import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { IsOptional, IsString } from 'class-validator'
import { SupabaseJwtGuard, SupabaseOptionalAuthGuard } from '../auth/supabase-jwt.guard'
import type { SupabaseUser } from '../auth/supabase-jwt.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { GuestEventsService } from './guest-events.service'

class ConfirmGuestDto {
  @IsOptional()
  @IsString()
  name?: string
}

@Controller('guest-events')
export class GuestEventsController {
  constructor(private readonly guestEvents: GuestEventsService) {}

  @UseGuards(SupabaseOptionalAuthGuard)
  @Get(':eventId')
  preview(@CurrentUser() user: SupabaseUser | undefined, @Param('eventId') eventId: string) {
    return this.guestEvents.preview(eventId, user?.id)
  }

  @UseGuards(SupabaseJwtGuard)
  @Post(':eventId/confirm')
  confirm(
    @CurrentUser() user: SupabaseUser,
    @Param('eventId') eventId: string,
    @Body() dto: ConfirmGuestDto,
  ) {
    return this.guestEvents.confirmAsGuest(eventId, user.id, dto.name)
  }
}
