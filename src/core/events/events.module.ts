import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';
import { EventService } from '../../realtime/services/event.service';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [EventBusService, EventService],
  exports: [EventBusService, EventService],
})
export class EventsModule {}

