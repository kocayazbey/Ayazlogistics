import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class TimescaleDBService {
  private readonly logger = new Logger(TimescaleDBService.name);
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.TIMESCALE_HOST || 'localhost',
      port: parseInt(process.env.TIMESCALE_PORT || '5432'),
      database: process.env.TIMESCALE_DATABASE || 'timeseries',
      user: process.env.TIMESCALE_USER,
      password: process.env.TIMESCALE_PASSWORD,
    });
  }

  async createHypertable(tableName: string, timeColumn: string = 'timestamp'): Promise<void> {
    try {
      await this.pool.query(
        `SELECT create_hypertable($1, $2, if_not_exists => TRUE)`,
        [tableName, timeColumn]
      );
      this.logger.log(`Hypertable created: ${tableName}`);
    } catch (error) {
      this.logger.error(`Failed to create hypertable ${tableName}:`, error);
      throw error;
    }
  }

  async insertMetric(metric: {
    timestamp: Date;
    metricName: string;
    value: number;
    tags?: Record<string, string>;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO metrics (timestamp, metric_name, value, tags) VALUES ($1, $2, $3, $4)`,
      [metric.timestamp, metric.metricName, metric.value, JSON.stringify(metric.tags || {})]
    );
  }

  async queryMetrics(
    metricName: string,
    startTime: Date,
    endTime: Date,
    interval: string = '1 hour',
  ): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT 
        time_bucket($1, timestamp) AS bucket,
        AVG(value) AS avg_value,
        MAX(value) AS max_value,
        MIN(value) AS min_value,
        COUNT(*) AS count
      FROM metrics
      WHERE metric_name = $2 AND timestamp BETWEEN $3 AND $4
      GROUP BY bucket
      ORDER BY bucket`,
      [interval, metricName, startTime, endTime]
    );

    return result.rows;
  }

  async createContinuousAggregate(viewName: string, interval: string): Promise<void> {
    await this.pool.query(`
      CREATE MATERIALIZED VIEW ${viewName}
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('${interval}', timestamp) AS bucket,
        metric_name,
        AVG(value) AS avg_value
      FROM metrics
      GROUP BY bucket, metric_name
    `);

    this.logger.log(`Continuous aggregate created: ${viewName}`);
  }

  async setRetentionPolicy(tableName: string, retentionDays: number): Promise<void> {
    await this.pool.query(`
      SELECT add_retention_policy($1, INTERVAL '${retentionDays} days')
    `, [tableName]);

    this.logger.log(`Retention policy set for ${tableName}: ${retentionDays} days`);
  }
}

