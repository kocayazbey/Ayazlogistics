import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  ARCHIVE = 'ARCHIVE',
}

export interface AuditLogEntry {
  userId: string;
  userName?: string;
  tenantId?: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  changes?: {
    before?: any;
    after?: any;
    diff?: any;
  };
  metadata?: {
    ipAddress: string;
    userAgent: string;
    method: string;
    endpoint: string;
    statusCode?: number;
    duration?: number;
    [key: string]: any;
  };
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface AuditQueryFilter {
  userId?: string;
  tenantId?: string;
  action?: AuditAction;
  entity?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  limit?: number;
  offset?: number;
}

@Injectable()
export class EnhancedAuditService {
  private readonly logger = new Logger(EnhancedAuditService.name);

  constructor(
    @Inject('DATABASE_POOL') private readonly pool: Pool,
    private readonly configService: ConfigService,
  ) {
    this.ensureAuditTable();
  }

  private async ensureAuditTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255),
        tenant_id VARCHAR(255),
        action VARCHAR(50) NOT NULL,
        entity VARCHAR(255) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        changes JSONB,
        metadata JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_tenant_id ON audit_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity);
      CREATE INDEX IF NOT EXISTS idx_audit_entity_id ON audit_logs(entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_success ON audit_logs(success);
    `;

    try {
      await this.pool.query(createTableQuery);
      this.logger.log('Audit logs table ensured');
    } catch (error) {
      this.logger.error('Failed to create audit logs table', error);
    }
  }

  async log(entry: AuditLogEntry): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        user_id, user_name, tenant_id, action, entity, entity_id, 
        changes, metadata, timestamp, success, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      entry.userId,
      entry.userName,
      entry.tenantId,
      entry.action,
      entry.entity,
      entry.entityId,
      entry.changes ? JSON.stringify(entry.changes) : null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.timestamp,
      entry.success,
      entry.errorMessage,
    ];

    try {
      await this.pool.query(query, values);
      this.logger.debug(
        `Audit log created: ${entry.action} ${entry.entity}:${entry.entityId} by ${entry.userId}`,
      );
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  async logCreate(
    userId: string,
    entity: string,
    entityId: string,
    data: any,
    metadata?: any,
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.CREATE,
      entity,
      entityId,
      changes: { after: data },
      metadata,
      timestamp: new Date(),
      success: true,
    });
  }

  async logUpdate(
    userId: string,
    entity: string,
    entityId: string,
    before: any,
    after: any,
    metadata?: any,
  ): Promise<void> {
    const diff = this.calculateDiff(before, after);
    
    await this.log({
      userId,
      action: AuditAction.UPDATE,
      entity,
      entityId,
      changes: { before, after, diff },
      metadata,
      timestamp: new Date(),
      success: true,
    });
  }

  async logDelete(
    userId: string,
    entity: string,
    entityId: string,
    data: any,
    metadata?: any,
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.DELETE,
      entity,
      entityId,
      changes: { before: data },
      metadata,
      timestamp: new Date(),
      success: true,
    });
  }

  async logRead(
    userId: string,
    entity: string,
    entityId: string,
    metadata?: any,
  ): Promise<void> {
    // Only log sensitive reads to reduce volume
    const sensitiveEntities = ['customer', 'invoice', 'contract', 'user'];
    if (!sensitiveEntities.includes(entity.toLowerCase())) {
      return;
    }

    await this.log({
      userId,
      action: AuditAction.READ,
      entity,
      entityId,
      metadata,
      timestamp: new Date(),
      success: true,
    });
  }

  async query(filter: AuditQueryFilter): Promise<AuditLogEntry[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filter.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(filter.userId);
    }

    if (filter.tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      values.push(filter.tenantId);
    }

    if (filter.action) {
      conditions.push(`action = $${paramIndex++}`);
      values.push(filter.action);
    }

    if (filter.entity) {
      conditions.push(`entity = $${paramIndex++}`);
      values.push(filter.entity);
    }

    if (filter.entityId) {
      conditions.push(`entity_id = $${paramIndex++}`);
      values.push(filter.entityId);
    }

    if (filter.startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(filter.startDate);
    }

    if (filter.endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(filter.endDate);
    }

    if (filter.success !== undefined) {
      conditions.push(`success = $${paramIndex++}`);
      values.push(filter.success);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter.limit || 100;
    const offset = filter.offset || 0;

    const query = `
      SELECT 
        user_id as "userId",
        user_name as "userName",
        tenant_id as "tenantId",
        action,
        entity,
        entity_id as "entityId",
        changes,
        metadata,
        timestamp,
        success,
        error_message as "errorMessage"
      FROM audit_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map((row) => ({
        ...row,
        timestamp: new Date(row.timestamp),
      }));
    } catch (error) {
      this.logger.error('Failed to query audit logs', error);
      return [];
    }
  }

  async getEntityHistory(
    entity: string,
    entityId: string,
  ): Promise<AuditLogEntry[]> {
    return this.query({ entity, entityId, limit: 1000 });
  }

  async getUserActivity(
    userId: string,
    limit: number = 100,
  ): Promise<AuditLogEntry[]> {
    return this.query({ userId, limit });
  }

  async getComplianceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    userActivity: Record<string, number>;
    failedActions: number;
    logs: AuditLogEntry[];
  }> {
    const logs = await this.query({ tenantId, startDate, endDate, limit: 10000 });

    const actionsByType: Record<string, number> = {};
    const userActivity: Record<string, number> = {};
    let failedActions = 0;

    logs.forEach((log) => {
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
      userActivity[log.userId] = (userActivity[log.userId] || 0) + 1;
      if (!log.success) failedActions++;
    });

    return {
      totalActions: logs.length,
      actionsByType,
      userActivity,
      failedActions,
      logs,
    };
  }

  async cleanupOldLogs(retentionDays: number = 2555): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const query = `
      DELETE FROM audit_logs
      WHERE timestamp < $1
      RETURNING id
    `;

    try {
      const result = await this.pool.query(query, [cutoffDate]);
      const deletedCount = result.rowCount || 0;
      this.logger.log(`Cleaned up ${deletedCount} old audit logs`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup old audit logs', error);
      return 0;
    }
  }

  private calculateDiff(before: any, after: any): any {
    if (!before || !after) return null;

    const diff: any = {};
    const allKeys = new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ]);

    allKeys.forEach((key) => {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        diff[key] = {
          old: before[key],
          new: after[key],
        };
      }
    });

    return Object.keys(diff).length > 0 ? diff : null;
  }
}

