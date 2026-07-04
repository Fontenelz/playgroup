import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { CommonModule } from './common/common.module'
import { UsersModule } from './users/users.module'
import { GroupsModule } from './groups/groups.module'
import { InvitesModule } from './invites/invites.module'
import { EventsModule } from './events/events.module'
import { GuestEventsModule } from './guest-events/guest-events.module'
import { NotificationsModule } from './notifications/notifications.module'
import { DashboardModule } from './dashboard/dashboard.module'

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
})
export class AppModule {}
