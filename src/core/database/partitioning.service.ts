import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

@Injectable()
export class PartitioningService {
  private readonly logger = new Logger(PartitioningService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async ensureMonthlyPartitions(tableName: string, monthsAhead: number = 3, monthsBack: number = 12): Promise<void> {
    for (let i = -monthsBack; i <= monthsAhead; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const year = date.getUTCFullYear();
      const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
      const partitionName = `${tableName}_${year}_${month}`;
      const from = `${year}-${month}-01`;
      const toDate = new Date(Date.UTC(year, parseInt(month, 10), 1));
      toDate.setUTCMonth(toDate.getUTCMonth() + 1);
      const to = `${toDate.getUTCFullYear()}-${`${toDate.getUTCMonth() + 1}`.padStart(2, '0')}-01`;

      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${tableName}
        FOR VALUES FROM ('${from}') TO ('${to}')
      `);

      this.logger.debug(`Ensured partition: ${partitionName}`);
    }
  }
}
