import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common'
import { IsArray, IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { SupabaseUser } from '../auth/supabase-jwt.service'
import { EventsService } from './events.service'

class CreateEventDto {
  @IsString()
  date!: string

  @IsString()
  startTime!: string

  @IsString()
  endTime!: string

  @IsIn(['none', 'weekly', 'biweekly', 'monthly'])
  recurrence!: 'none' | 'weekly' | 'biweekly' | 'monthly'

  @IsArray()
  @IsString({ each: true })
  weekDays!: string[]

  @IsString()
  seriesEnd!: string

  @IsOptional()
  @IsString()
  locationName?: string

  @IsOptional()
  @IsString()
  locationAddress?: string

  @IsInt()
  @IsPositive()
  maxParticipants!: number

  @IsInt()
  monthlySlots!: number

  @IsInt()
  monthlyConfirmHours!: number

  @IsOptional()
  @IsString()
  eventFee?: string

  @IsOptional()
  @IsString()
  notes?: string
}

class CreateStandaloneEventDto {
  @IsString()
  sport!: string

  @IsString()
  date!: string

  @IsString()
  startTime!: string

  @IsString()
  endTime!: string

  @IsOptional()
  @IsString()
  locationName?: string

  @IsOptional()
  @IsString()
  locationAddress?: string

  @IsInt()
  @IsPositive()
  maxParticipants!: number

  @IsIn(['link_only', 'public'])
  visibility!: 'link_only' | 'public'

  @IsOptional()
  @IsString()
  notes?: string
}

@UseGuards(SupabaseJwtGuard)
@Controller()
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post('groups/:groupId/events')
  create(
    @CurrentUser() user: SupabaseUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.events.create(groupId, user.id, dto)
  }

  @Post('events')
  createStandalone(@CurrentUser() user: SupabaseUser, @Body() dto: CreateStandaloneEventDto) {
    return this.events.createStandalone(user.id, dto)
  }

  // IMPORTANTE: precisa vir antes de 'events/:eventId', senão o Express
  // casa "discover" como se fosse um :eventId.
  @Get('events/discover')
  discover(
    @CurrentUser() user: SupabaseUser,
    @Query('page') page?: string,
    @Query('take') take?: string,
    @Query('sport') sport?: string,
  ) {
    return this.events.discoverPublic(user.id, {
      page: page ? Number.parseInt(page, 10) : undefined,
      take: take ? Number.parseInt(take, 10) : undefined,
      sport,
    })
  }

  @Get('events/:eventId')
  detail(@CurrentUser() user: SupabaseUser, @Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.events.detail(eventId, user.id)
  }

  @Post('events/:eventId/participation/confirm')
  async confirm(@CurrentUser() user: SupabaseUser, @Param('eventId', ParseUUIDPipe) eventId: string) {
    await this.events.confirmParticipation(eventId, user.id)
    return {}
  }

  @Post('events/:eventId/participation/decline')
  async decline(@CurrentUser() user: SupabaseUser, @Param('eventId', ParseUUIDPipe) eventId: string) {
    await this.events.declineParticipation(eventId, user.id)
    return {}
  }

  @Post('events/:eventId/participants/:participantUserId/approve')
  approveParticipant(
    @CurrentUser() user: SupabaseUser,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('participantUserId', ParseUUIDPipe) participantUserId: string,
  ) {
    return this.events.approveParticipant(eventId, participantUserId, user.id)
  }

  @Post('events/:eventId/participants/:participantUserId/reject')
  rejectParticipant(
    @CurrentUser() user: SupabaseUser,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('participantUserId', ParseUUIDPipe) participantUserId: string,
  ) {
    return this.events.rejectParticipant(eventId, participantUserId, user.id)
  }

  @Get('events/:eventId/finance')
  finance(@CurrentUser() user: SupabaseUser, @Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.events.financeData(eventId, user.id)
  }

  @Get('events/:eventId/draw')
  draw(@CurrentUser() user: SupabaseUser, @Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.events.drawData(eventId, user.id)
  }
}
