import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PartitioningService } from './partitioning.service';

@Injectable()
export class PartitioningScheduler {
  private readonly logger = new Logger(PartitioningScheduler.name);

  constructor(private readonly partitioning: PartitioningService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async ensurePartitions(): Promise<void> {
    await this.partitioning.ensureMonthlyPartitions('event_logs', 3, 12);
    this.logger.log('Ensured monthly partitions for event_logs');
  }
}
