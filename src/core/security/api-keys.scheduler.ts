import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiKeysService } from './api-keys.service';

@Injectable()
export class ApiKeysScheduler {
  private readonly logger = new Logger(ApiKeysScheduler.name);

  constructor(private readonly apiKeys: ApiKeysService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireKeys(): Promise<void> {
    const expired = await this.apiKeys.expireKeys();
    if (expired) {
      this.logger.log(`Expired ${expired} API keys`);
    }
  }
}
