import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface LogEntry {
  id: string;
  tenantId: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  context: Record<string, any>;
  timestamp: Date;
  service: string;
  userId?: string;
  requestId?: string;
}

export interface Metric {
  id: string;
  tenantId: string;
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: Date;
}

export interface SSOProvider {
  id: string;
  tenantId: string;
  name: string;
  type: 'saml' | 'oauth2' | 'ldap' | 'azure_ad' | 'google';
  config: Record<string, any>;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
}

export interface MFAConfig {
  id: string;
  tenantId: string;
  userId: string;
  method: 'totp' | 'sms' | 'email' | 'hardware_key';
  secret?: string;
  backupCodes: string[];
  isEnabled: boolean;
  createdAt: Date;
}

export interface KeyManagement {
  id: string;
  tenantId: string;
  name: string;
  type: 'encryption' | 'signing' | 'api' | 'database';
  algorithm: string;
  keySize: number;
  publicKey?: string;
  privateKey?: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class ObservabilitySecurityService {
  private readonly logger = new Logger(ObservabilitySecurityService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async createLogEntry(logEntry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<LogEntry> {
    const id = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO log_entries (id, tenant_id, level, message, context, timestamp, service, user_id, request_id)
      VALUES (${id}, ${logEntry.tenantId}, ${logEntry.level}, ${logEntry.message},
              ${JSON.stringify(logEntry.context)}, ${now}, ${logEntry.service},
              ${logEntry.userId || null}, ${logEntry.requestId || null})
    `);

    return {
      id,
      ...logEntry,
      timestamp: now,
    };
  }

  async getLogs(tenantId: string, filters?: {
    level?: string;
    service?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<LogEntry[]> {
    let query = sql`SELECT * FROM log_entries WHERE tenant_id = ${tenantId}`;
    
    if (filters?.level) {
      query = sql`SELECT * FROM log_entries WHERE tenant_id = ${tenantId} AND level = ${filters.level}`;
    }
    if (filters?.service) {
      query = sql`SELECT * FROM log_entries WHERE tenant_id = ${tenantId} AND service = ${filters.service}`;
    }
    if (filters?.startDate) {
      query = sql`SELECT * FROM log_entries WHERE tenant_id = ${tenantId} AND timestamp >= ${filters.startDate}`;
    }
    if (filters?.endDate) {
      query = sql`SELECT * FROM log_entries WHERE tenant_id = ${tenantId} AND timestamp <= ${filters.endDate}`;
    }

    if (filters?.limit) {
      query = sql`${query} ORDER BY timestamp DESC LIMIT ${filters.limit}`;
    } else {
      query = sql`${query} ORDER BY timestamp DESC LIMIT 1000`;
    }

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      level: row.level as LogEntry['level'],
      message: row.message as string,
      context: JSON.parse(row.context as string),
      timestamp: new Date(row.timestamp as string),
      service: row.service as string,
      userId: row.user_id as string,
      requestId: row.request_id as string,
    }));
  }

  async createMetric(metric: Omit<Metric, 'id' | 'timestamp'>): Promise<Metric> {
    const id = `METRIC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO metrics (id, tenant_id, name, value, unit, tags, timestamp)
      VALUES (${id}, ${metric.tenantId}, ${metric.name}, ${metric.value},
              ${metric.unit}, ${JSON.stringify(metric.tags)}, ${now})
    `);

    return {
      id,
      ...metric,
      timestamp: now,
    };
  }

  async getMetrics(tenantId: string, name?: string, startDate?: Date, endDate?: Date): Promise<Metric[]> {
    let query = sql`SELECT * FROM metrics WHERE tenant_id = ${tenantId}`;
    
    if (name) {
      query = sql`SELECT * FROM metrics WHERE tenant_id = ${tenantId} AND name = ${name}`;
    }
    if (startDate) {
      query = sql`SELECT * FROM metrics WHERE tenant_id = ${tenantId} AND timestamp >= ${startDate}`;
    }
    if (endDate) {
      query = sql`SELECT * FROM metrics WHERE tenant_id = ${tenantId} AND timestamp <= ${endDate}`;
    }

    query = sql`${query} ORDER BY timestamp DESC LIMIT 10000`;

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      value: parseFloat(row.value as string),
      unit: row.unit as string,
      tags: JSON.parse(row.tags as string),
      timestamp: new Date(row.timestamp as string),
    }));
  }

  async createSSOProvider(ssoProvider: Omit<SSOProvider, 'id' | 'createdAt'>): Promise<SSOProvider> {
    const id = `SSO-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO sso_providers (id, tenant_id, name, type, config, is_active, is_default, created_at)
      VALUES (${id}, ${ssoProvider.tenantId}, ${ssoProvider.name}, ${ssoProvider.type},
              ${JSON.stringify(ssoProvider.config)}, ${ssoProvider.isActive}, ${ssoProvider.isDefault}, ${now})
    `);

    this.logger.log(`SSO provider created: ${id} for tenant ${ssoProvider.tenantId}`);

    return {
      id,
      ...ssoProvider,
      createdAt: now,
    };
  }

  async createMFAConfig(mfaConfig: Omit<MFAConfig, 'id' | 'createdAt'>): Promise<MFAConfig> {
    const id = `MFA-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO mfa_configs (id, tenant_id, user_id, method, secret, backup_codes, is_enabled, created_at)
      VALUES (${id}, ${mfaConfig.tenantId}, ${mfaConfig.userId}, ${mfaConfig.method},
              ${mfaConfig.secret || null}, ${JSON.stringify(mfaConfig.backupCodes)}, ${mfaConfig.isEnabled}, ${now})
    `);

    this.logger.log(`MFA config created: ${id} for user ${mfaConfig.userId}`);

    return {
      id,
      ...mfaConfig,
      createdAt: now,
    };
  }

  async createKeyManagement(keyManagement: Omit<KeyManagement, 'id' | 'createdAt'>): Promise<KeyManagement> {
    const id = `KEY-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO key_management (id, tenant_id, name, type, algorithm, key_size, public_key,
                                 private_key, expires_at, is_active, created_at)
      VALUES (${id}, ${keyManagement.tenantId}, ${keyManagement.name}, ${keyManagement.type},
              ${keyManagement.algorithm}, ${keyManagement.keySize}, ${keyManagement.publicKey || null},
              ${keyManagement.privateKey || null}, ${keyManagement.expiresAt || null}, ${keyManagement.isActive}, ${now})
    `);

    this.logger.log(`Key management created: ${id} for tenant ${keyManagement.tenantId}`);

    return {
      id,
      ...keyManagement,
      createdAt: now,
    };
  }

  async getObservabilitySecurityDashboard(tenantId: string): Promise<any> {
    const logsResult = await this.db.execute(sql`
      SELECT level, COUNT(*) as count FROM log_entries 
      WHERE tenant_id = ${tenantId} AND timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY level
    `);

    const metricsResult = await this.db.execute(sql`
      SELECT name, AVG(value) as avg_value, MAX(value) as max_value, MIN(value) as min_value
      FROM metrics WHERE tenant_id = ${tenantId} AND timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY name
    `);

    const ssoProvidersResult = await this.db.execute(sql`
      SELECT * FROM sso_providers WHERE tenant_id = ${tenantId} AND is_active = true
    `);

    const mfaConfigsResult = await this.db.execute(sql`
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_enabled = true) as enabled
      FROM mfa_configs WHERE tenant_id = ${tenantId}
    `);

    const keyManagementResult = await this.db.execute(sql`
      SELECT type, COUNT(*) as count FROM key_management 
      WHERE tenant_id = ${tenantId} AND is_active = true
      GROUP BY type
    `);

    return {
      logs: {
        summary: logsResult.map(row => ({
          level: row.level as string,
          count: parseInt(row.count as string),
        })),
        totalLogs: logsResult.reduce((sum, row) => sum + parseInt(row.count as string), 0),
      },
      metrics: {
        summary: metricsResult.map(row => ({
          name: row.name as string,
          average: parseFloat(row.avg_value as string),
          maximum: parseFloat(row.max_value as string),
          minimum: parseFloat(row.min_value as string),
        })),
        totalMetrics: metricsResult.length,
      },
      sso: {
        providers: ssoProvidersResult.length,
        active: ssoProvidersResult.map(row => ({
          name: row.name as string,
          type: row.type as string,
          isDefault: row.is_default as boolean,
        })),
      },
      mfa: {
        total: parseInt(mfaConfigsResult[0]?.total as string || '0'),
        enabled: parseInt(mfaConfigsResult[0]?.enabled as string || '0'),
        coverage: mfaConfigsResult.length > 0 
          ? (parseInt(mfaConfigsResult[0]?.enabled as string || '0') / parseInt(mfaConfigsResult[0]?.total as string || '1')) * 100 
          : 0,
      },
      keyManagement: {
        summary: keyManagementResult.map(row => ({
          type: row.type as string,
          count: parseInt(row.count as string),
        })),
        totalKeys: keyManagementResult.reduce((sum, row) => sum + parseInt(row.count as string), 0),
      },
    };
  }
}
