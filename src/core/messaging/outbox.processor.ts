import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxService } from './outbox.service';

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(private readonly outbox: OutboxService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleOutbox(): Promise<void> {
    const { sent, failed } = await this.outbox.processPending(100);
    if (sent || failed) {
      this.logger.log(`Outbox processed: sent=${sent} failed=${failed}`);
    }
  }
}
