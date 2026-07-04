import { Module } from '@nestjs/common'
import { GuestEventsController } from './guest-events.controller'
import { GuestEventsService } from './guest-events.service'

@Module({
  controllers: [GuestEventsController],
  providers: [GuestEventsService],
})
export class GuestEventsModule {}
