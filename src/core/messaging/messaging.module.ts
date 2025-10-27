import { Module, Global } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { OutboxProcessor } from './outbox.processor';

@Global()
@Module({
  providers: [OutboxService, OutboxProcessor],
  exports: [OutboxService],
})
export class MessagingModule {}
