import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TimescaleDBService } from './timescaledb.service';

@Injectable()
export class TimescaleDBScheduler {
  private readonly logger = new Logger(TimescaleDBScheduler.name);

  constructor(private readonly tsdb: TimescaleDBService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async applyRetentionPolicies(): Promise<void> {
    const tables = [
      { name: 'iot_sensor_data', days: 90 },
      { name: 'vehicle_locations', days: 30 },
      { name: 'http_request_metrics', days: 14 },
    ];

    for (const t of tables) {
      try {
        await this.tsdb.setRetentionPolicy(t.name, t.days);
        this.logger.log(`Retention policy applied for ${t.name}: ${t.days} days`);
      } catch (e) {
        this.logger.warn(`Retention policy failed for ${t.name}: ${e?.message || e}`);
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async ensureContinuousAggregates(): Promise<void> {
    const views = [
      { name: 'iot_sensor_hourly', interval: '1 hour' },
      { name: 'vehicle_locations_15min', interval: '15 minutes' },
    ];

    for (const v of views) {
      try {
        await this.tsdb.createContinuousAggregate(v.name, v.interval);
        this.logger.log(`Continuous aggregate ensured: ${v.name}`);
      } catch (e) {
        this.logger.warn(`Continuous aggregate failed: ${v.name} - ${e?.message || e}`);
      }
    }
  }
}
