import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AuthModule } from './auth/auth.module'
import { CommonModule } from './common/common.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { EventsModule } from './events/events.module'
import { GroupsModule } from './groups/groups.module'
import { GuestEventsModule } from './guest-events/guest-events.module'
import { InvitesModule } from './invites/invites.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [AppController],
})
export class AppModule {}
