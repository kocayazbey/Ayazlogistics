import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

@Injectable()
export class UptimeMonitorService {
  private readonly logger = new Logger('UptimeMonitorService');

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async getSystemUptime(tenantId: string, period: { start: Date; end: Date }): Promise<any> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          COUNT(CASE WHEN status = 'up' THEN 1 END) as up,
          COUNT(CASE WHEN status = 'down' THEN 1 END) as down,
          AVG(response_time) as avg_response_time
        FROM uptime_checks 
        WHERE tenant_id = ${tenantId}
          AND checked_at BETWEEN ${period.start} AND ${period.end}
      `);

      const overall = result[0];
      const total = Number(overall.up) + Number(overall.down);
      const uptimePercentage = total > 0 ? (Number(overall.up) / total) * 100 : 0;

      return {
        uptimePercentage,
        totalChecks: total,
        avgResponseTime: Number(overall.avg_response_time || 0),
        overall: {
          up: parseInt(String(overall.up || '0')),
          down: parseInt(String(overall.down || '0')),
        },
      };
    } catch (error) {
      this.logger.error(`Error getting system uptime: ${error.message}`);
      throw error;
    }
  }

  async getServiceStatus(tenantId: string): Promise<any> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          service_name, status, last_check, response_time, error_message
        FROM uptime_checks 
        WHERE tenant_id = ${tenantId}
          AND checked_at >= NOW() - INTERVAL '5 minutes'
        ORDER BY checked_at DESC
      `);

      return result.map(row => ({
        serviceName: String(row.service_name),
        status: String(row.status),
        lastCheck: new Date(String(row.last_check)),
        responseTime: Number(row.response_time || 0),
        errorMessage: row.error_message ? String(row.error_message) : null,
      }));
    } catch (error) {
      this.logger.error(`Error getting service status: ${error.message}`);
      throw error;
    }
  }

  async recordUptimeCheck(
    serviceName: string, 
    status: 'up' | 'down', 
    responseTime: number, 
    errorMessage: string | null, 
    tenantId: string
  ): Promise<void> {
    try {
      await this.db.execute(sql`
        INSERT INTO uptime_checks (
          service_name, status, response_time, error_message, tenant_id, checked_at
        ) VALUES (
          ${serviceName}, ${status}, ${responseTime}, ${errorMessage || null}, ${tenantId}, NOW()
        )
      `);
    } catch (error) {
      this.logger.error(`Error recording uptime check: ${error.message}`);
      throw error;
    }
  }
}