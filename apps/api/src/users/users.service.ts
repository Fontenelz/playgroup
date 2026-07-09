import { Injectable } from '@nestjs/common'
import type { SupabaseUser } from '../auth/supabase-jwt.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getProfile(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } })
  }

  async getProfileSummary(userId: string) {
    const [profile, memberships, presences] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.groupMember.findMany({
        where: { userId, status: 'active' },
        select: { group: { select: { id: true, name: true, sport: true } } },
      }),
      this.prisma.eventParticipant.count({ where: { userId, status: 'present' } }),
    ])

    return {
      profile,
      groups: memberships.map((m) => m.group),
      presences,
    }
  }

  saveProfile(
    user: SupabaseUser,
    dto: { name: string; nickname: string; city?: string; sports: string[] },
  ) {
    return this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email,
        name: dto.name,
        nickname: dto.nickname,
        city: dto.city ?? null,
        sports: dto.sports,
        skillLevel: 'intermediate',
        avatarUrl: user.avatarUrl,
      },
      update: {
        email: user.email,
        name: dto.name,
        nickname: dto.nickname,
        city: dto.city ?? null,
        sports: dto.sports,
        ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
      },
    })
  }

  updateProfile(
    userId: string,
    dto: {
      name?: string
      nickname?: string
      city?: string
      sports?: string[]
      bio?: string
      skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'professional'
      avatarUrl?: string
    },
  ) {
    return this.prisma.user.update({ where: { id: userId }, data: dto })
  }
}
