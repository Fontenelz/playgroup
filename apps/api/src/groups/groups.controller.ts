import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { IsIn, IsInt, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { SupabaseUser } from '../auth/supabase-jwt.service'
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

  @Get('groups/:groupId')
  detail(@CurrentUser() user: SupabaseUser, @Param('groupId') groupId: string) {
    return this.groups.getDetail(groupId, user.id)
  }

  @Get('groups/:groupId/basic')
  basic(@CurrentUser() user: SupabaseUser, @Param('groupId') groupId: string) {
    return this.groups.getBasic(groupId, user.id)
  }

  @Post('groups/:groupId/invite-codes')
  createInvite(@CurrentUser() user: SupabaseUser, @Param('groupId') groupId: string) {
    return this.groups.createInviteCode(groupId, user.id)
  }
}
