import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from 'jose'

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
    const supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL')
    this.issuer = `${supabaseUrl}/auth/v1`

    try {
      this.jwks = createRemoteJWKSet(new URL(jwksUrl))
    } catch {
      throw new Error(
        `SUPABASE_JWKS_URL inválida: "${jwksUrl}". Configure a URL completa, ex: https://<projeto>.supabase.co/auth/v1/.well-known/jwks.json`,
      )
    }
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
