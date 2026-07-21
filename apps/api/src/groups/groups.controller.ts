import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { IsIn, IsInt, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard'
import type { SupabaseUser } from '../auth/supabase-jwt.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { GroupsService } from './groups.service'

class CreateGroupDto {
  @IsString()
  sport!: string

  @IsString()
  @MaxLength(80)
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsIn(['public', 'invite', 'private'])
  accessType!: 'public' | 'invite' | 'private'

  @IsInt()
  @IsPositive()
  maxMembers!: number

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyFee?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  perEventFee?: number

  @IsOptional()
  @IsInt()
  paymentDay?: number
}

class UpdateMemberRoleDto {
  @IsIn(['organizer', 'participant'])
  role!: 'organizer' | 'participant'
}

@UseGuards(SupabaseJwtGuard)
@Controller()
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get('groups')
  list(@CurrentUser() user: SupabaseUser) {
    return this.groups.listForUser(user.id)
  }

  @Post('groups')
  create(@CurrentUser() user: SupabaseUser, @Body() dto: CreateGroupDto) {
    return this.groups.create(user.id, dto)
  }

  // Precisa vir antes de `groups/:groupId`, senão o Nest casa "discover" como se fosse um :groupId.
  @Get('groups/discover')
  discover(
    @CurrentUser() user: SupabaseUser,
    @Query('page') page?: string,
    @Query('take') take?: string,
    @Query('sport') sport?: string,
  ) {
    return this.groups.discoverPublic(user.id, {
      page: page ? Number.parseInt(page, 10) : undefined,
      take: take ? Number.parseInt(take, 10) : undefined,
      sport,
    })
  }

  @Get('groups/:groupId')
  detail(@CurrentUser() user: SupabaseUser, @Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.groups.getDetail(groupId, user.id)
  }

  @Get('groups/:groupId/basic')
  basic(@CurrentUser() user: SupabaseUser, @Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.groups.getBasic(groupId, user.id)
  }

  @Get('groups/:groupId/preview')
  preview(@CurrentUser() user: SupabaseUser, @Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.groups.getPreview(groupId, user.id)
  }

  @Post('groups/:groupId/join-request')
  requestToJoin(
    @CurrentUser() user: SupabaseUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.groups.requestToJoin(groupId, user.id)
  }

  @Post('groups/:groupId/members/:userId/approve')
  approveJoinRequest(
    @CurrentUser() user: SupabaseUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.groups.approveJoinRequest(groupId, userId, user.id)
  }

  @Post('groups/:groupId/members/:userId/reject')
  rejectJoinRequest(
    @CurrentUser() user: SupabaseUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.groups.rejectJoinRequest(groupId, userId, user.id)
  }

  @Post('groups/:groupId/invite-codes')
  createInvite(
    @CurrentUser() user: SupabaseUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.groups.createInviteCode(groupId, user.id)
  }

  @Delete('groups/:groupId/members/:userId')
  removeMember(
    @CurrentUser() user: SupabaseUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.groups.removeMember(groupId, user.id, userId)
  }

  @Patch('groups/:groupId/members/:userId/role')
  updateMemberRole(
    @CurrentUser() user: SupabaseUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.groups.updateMemberRole(groupId, user.id, userId, dto.role)
  }
}
