import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { users } from '@/database/schema/core/users.schema';
import * as schema from '@/database/schema';

interface APIUsageMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  requestsPerSecond: number;
}

interface APIUsageByUser {
  userId: string;
  email: string;
  requestCount: number;
  endpoints: Record<string, number>;
  lastRequestAt: Date;
  quotaUsage: number;
  quotaLimit: number;
}

interface APITrend {
  date: string;
  requests: number;
  errors: number;
  avgResponseTime: number;
}

@Injectable()
export class APIAnalyticsService {
  private readonly logger = new Logger(APIAnalyticsService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: any) {}

  async trackAPIRequest(
    endpoint: string,
    method: string,
    userId: string,
    responseTime: number,
    statusCode: number,
    ipAddress: string
  ): Promise<void> {
    await this.db.execute(
      `INSERT INTO api_request_logs
       (endpoint, method, user_id, response_time, status_code, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [endpoint, method, userId, responseTime, statusCode, ipAddress]
    );
  }

  async getEndpointMetrics(period: { start: Date; end: Date }): Promise<APIUsageMetrics[]> {
    const result = await this.db.execute(
      `SELECT 
        endpoint,
        method,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status_code < 400) as successful_requests,
        COUNT(*) FILTER (WHERE status_code >= 400) as failed_requests,
        AVG(response_time) as avg_response_time,
        MAX(response_time) as max_response_time,
        MIN(response_time) as min_response_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_response_time,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) as p99_response_time
       FROM api_request_logs
       WHERE created_at BETWEEN $1 AND $2
       GROUP BY endpoint, method
       ORDER BY total_requests DESC
       LIMIT 50`,
      [period.start, period.end]
    );

    return result.rows.map(row => {
      const total = parseInt(row.total_requests);
      const failed = parseInt(row.failed_requests);
      const duration = (period.end.getTime() - period.start.getTime()) / 1000;

      return {
        endpoint: row.endpoint,
        method: row.method,
        totalRequests: total,
        successfulRequests: parseInt(row.successful_requests),
        failedRequests: failed,
        avgResponseTime: parseFloat(row.avg_response_time),
        maxResponseTime: parseFloat(row.max_response_time),
        minResponseTime: parseFloat(row.min_response_time),
        p95ResponseTime: parseFloat(row.p95_response_time),
        p99ResponseTime: parseFloat(row.p99_response_time),
        errorRate: (failed / total) * 100,
        requestsPerSecond: total / duration,
      };
    });
  }

  async getUserUsageStatistics(): Promise<APIUsageByUser[]> {
    const result = await this.db.execute(
      `SELECT 
        u.id as user_id,
        u.email,
        COUNT(a.id) as request_count,
        MAX(a.created_at) as last_request_at
       FROM users u
       LEFT JOIN api_request_logs a ON u.id = a.user_id
       WHERE a.created_at > NOW() - INTERVAL '30 days'
       GROUP BY u.id, u.email
       ORDER BY request_count DESC
       LIMIT 100`
    );

    return result.map(row => ({
      userId: row.user_id,
      email: row.email,
      requestCount: parseInt(row.request_count || '0'),
      endpoints: {},
      lastRequestAt: new Date(row.last_request_at),
      quotaUsage: parseInt(row.request_count || '0'),
      quotaLimit: 10000,
    }));
  }

  async getAPITrends(days: number = 30): Promise<APITrend[]> {
    const result = await this.db.execute(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as requests,
        COUNT(*) FILTER (WHERE status_code >= 400) as errors,
        AVG(response_time) as avg_response_time
       FROM api_request_logs
       WHERE created_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      []
    );

    return result.map(row => ({
      date: row.date,
      requests: parseInt(row.requests),
      errors: parseInt(row.errors),
      avgResponseTime: parseFloat(row.avg_response_time),
    }));
  }

  async detectAnomalies(): Promise<any[]> {
    const result = await this.db.execute(
      `SELECT 
        endpoint,
        COUNT(*) as count,
        AVG(response_time) as avg_time
       FROM api_request_logs
       WHERE created_at > NOW() - INTERVAL '1 hour'
       GROUP BY endpoint
       HAVING COUNT(*) > 1000 OR AVG(response_time) > 5000`
    );

    return result.map(row => ({
      endpoint: row.endpoint,
      anomalyType: parseInt(row.count) > 1000 ? 'high_traffic' : 'slow_response',
      value: parseInt(row.count) > 1000 ? row.count : row.avg_time,
      severity: 'medium',
    }));
  }
}

