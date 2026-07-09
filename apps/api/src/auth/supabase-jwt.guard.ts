import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import { SupabaseJwtService, type SupabaseUser } from './supabase-jwt.service'

export interface AuthenticatedRequest extends Request {
  user?: SupabaseUser
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim() || null
}

/** Exige um usuário autenticado; popula req.user. */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(private readonly jwtService: SupabaseJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = extractBearerToken(req)
    if (!token) throw new UnauthorizedException('Token ausente')

    req.user = await this.jwtService.verify(token)
    return true
  }
}

/** Popula req.user quando há token válido, mas não bloqueia requisições anônimas. */
@Injectable()
export class SupabaseOptionalAuthGuard implements CanActivate {
  constructor(private readonly jwtService: SupabaseJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = extractBearerToken(req)
    if (!token) return true

    try {
      req.user = await this.jwtService.verify(token)
    } catch {
      // token presente mas inválido: segue como anônimo em vez de bloquear
    }
    return true
  }
}
