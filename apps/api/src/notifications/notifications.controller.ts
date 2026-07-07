import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { SupabaseUser } from '../auth/supabase-jwt.service'
import { NotificationsService } from './notifications.service'

@UseGuards(SupabaseJwtGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: SupabaseUser) {
    return this.notifications.list(user.id)
  }

  @Post(':id/read')
  async markRead(@CurrentUser() user: SupabaseUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.notifications.markRead(id, user.id)
    return {}
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: SupabaseUser) {
    await this.notifications.markAllRead(user.id)
    return {}
  }

  @Delete(':id')
  async remove(@CurrentUser() user: SupabaseUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.notifications.remove(id, user.id)
    return {}
  }
}
