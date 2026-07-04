import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { AuthenticatedRequest } from '../../auth/supabase-jwt.guard'

/** Usuário autenticado (SupabaseJwtGuard) ou undefined (SupabaseOptionalAuthGuard). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
  return req.user
})
