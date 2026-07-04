import { Controller, Get, UseGuards } from '@nestjs/common'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { SupabaseUser } from '../auth/supabase-jwt.service'
import { DashboardService } from './dashboard.service'

@UseGuards(SupabaseJwtGuard)
@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('home')
  home(@CurrentUser() user: SupabaseUser) {
    return this.dashboard.home(user.id)
  }

  @Get('ranking')
  ranking(@CurrentUser() user: SupabaseUser) {
    return this.dashboard.ranking(user.id)
  }
}
