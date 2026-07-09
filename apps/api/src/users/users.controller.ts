import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common'
import { IsArray, IsOptional, IsString } from 'class-validator'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard'
import type { SupabaseUser } from '../auth/supabase-jwt.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UsersService } from './users.service'

class SaveProfileDto {
  @IsString()
  name!: string

  @IsString()
  nickname!: string

  @IsOptional()
  @IsString()
  city?: string

  @IsArray()
  @IsString({ each: true })
  sports!: string[]
}

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  nickname?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sports?: string[]
}

@UseGuards(SupabaseJwtGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getProfile(@CurrentUser() user: SupabaseUser) {
    return this.users.getProfile(user.id)
  }

  @Get('summary')
  getSummary(@CurrentUser() user: SupabaseUser) {
    return this.users.getProfileSummary(user.id)
  }

  @Put()
  saveProfile(@CurrentUser() user: SupabaseUser, @Body() dto: SaveProfileDto) {
    return this.users.saveProfile(user, dto)
  }

  @Patch()
  updateProfile(@CurrentUser() user: SupabaseUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto)
  }
}
