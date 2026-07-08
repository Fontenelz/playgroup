import { Global, Module } from '@nestjs/common'
import { SupabaseJwtGuard, SupabaseOptionalAuthGuard } from './supabase-jwt.guard'
import { SupabaseJwtService } from './supabase-jwt.service'

@Global()
@Module({
  providers: [SupabaseJwtService, SupabaseJwtGuard, SupabaseOptionalAuthGuard],
  exports: [SupabaseJwtService, SupabaseJwtGuard, SupabaseOptionalAuthGuard],
})
export class AuthModule {}
