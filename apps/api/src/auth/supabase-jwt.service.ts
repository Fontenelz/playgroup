import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

export interface SupabaseUser {
  id: string
  email: string | null
  avatarUrl: string | null
}

@Injectable()
export class SupabaseJwtService {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>
  private readonly issuer: string

  constructor(private readonly config: ConfigService) {
    const jwksUrl = this.config.getOrThrow<string>('SUPABASE_JWKS_URL')
    this.issuer = `${this.config.getOrThrow<string>('SUPABASE_URL')}/auth/v1`
    this.jwks = createRemoteJWKSet(new URL(jwksUrl))
  }

  async verify(token: string): Promise<SupabaseUser> {
    let payload: JWTPayload
    try {
      const result = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
      })
      payload = result.payload
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada')
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Token sem identificador de usuário')
    }

    const meta = payload.user_metadata as Record<string, unknown> | undefined
    const avatarUrl =
      (typeof meta?.avatar_url === 'string' && meta.avatar_url) ||
      (typeof meta?.picture === 'string' && meta.picture) ||
      null

    return {
      id: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      avatarUrl,
    }
  }
}
