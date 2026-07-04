import { Global, Module } from '@nestjs/common'
import { SupabaseJwtService } from './supabase-jwt.service'
import { SupabaseJwtGuard, SupabaseOptionalAuthGuard } from './supabase-jwt.guard'

@Global()
@Module({
  providers: [SupabaseJwtService, SupabaseJwtGuard, SupabaseOptionalAuthGuard],
  exports: [SupabaseJwtService, SupabaseJwtGuard, SupabaseOptionalAuthGuard],
})
export class AuthModule {}
