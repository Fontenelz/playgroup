import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AppController } from './app.controller'
import { AuthModule } from './auth/auth.module'
import { CommonModule } from './common/common.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { EventsModule } from './events/events.module'
import { GroupsModule } from './groups/groups.module'
import { GuestEventsModule } from './guest-events/guest-events.module'
import { InvitesModule } from './invites/invites.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PaymentsModule } from './payments/payments.module'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Limite padrão para toda a API; rotas mais sensíveis (convites, guest-events)
    // sobrescrevem com @Throttle um limite mais agressivo (ver seus controllers).
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
    }),
    PrismaModule,
    AuthModule,
    CommonModule,
    UsersModule,
    GroupsModule,
    InvitesModule,
    EventsModule,
    GuestEventsModule,
    NotificationsModule,
    DashboardModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
