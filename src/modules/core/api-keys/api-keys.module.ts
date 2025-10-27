import { Module } from '@nestjs/common';
import { APIKeysController } from './controllers/api-keys.controller';
import { APIAccessService } from '../../logistics/ayaz-user-portal/api-access/api-access.service';
import { EventBusService } from '../../../core/events/event-bus.service';

@Module({
  controllers: [APIKeysController],
  providers: [APIAccessService, EventBusService],
  exports: [APIAccessService],
})
export class APIKeysModule {}
