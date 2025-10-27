import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { auditLogs } from '@/database/schema/core/tenants.schema';

interface AuditEntry {
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  responseStatus?: number;
  metadata?: any;
}

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        oldValues: entry.oldValues,
        newValues: entry.newValues,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        requestMethod: entry.requestMethod,
        requestPath: entry.requestPath,
        responseStatus: entry.responseStatus,
        metadata: entry.metadata || {},
      });

      this.logger.debug(`Audit log created: ${entry.action} on ${entry.resource}`);
    } catch (error) {
      this.logger.error('Audit logging failed:', error);
    }
  }

  async logCreate(tenantId: string, userId: string, resource: string, data: any, metadata?: any): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'create',
      resource,
      newValues: data,
      metadata,
    });
  }

  async logUpdate(tenantId: string, userId: string, resource: string, resourceId: string, oldData: any, newData: any): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'update',
      resource,
      resourceId,
      oldValues: oldData,
      newValues: newData,
    });
  }

  async logDelete(tenantId: string, userId: string, resource: string, resourceId: string, data: any): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'delete',
      resource,
      resourceId,
      oldValues: data,
    });
  }

  async logLogin(tenantId: string, userId: string, ipAddress: string, userAgent: string, success: boolean): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: success ? 'login' : 'login_failed',
      resource: 'auth',
      ipAddress,
      userAgent,
      metadata: { success },
    });
  }

  async getAuditTrail(resourceType: string, resourceId: string, limit: number = 100): Promise<any[]> {
    const result = await this.db.execute(
      `SELECT * FROM audit_logs WHERE resource = $1 AND resource_id = $2 ORDER BY created_at DESC LIMIT $3`,
      [resourceType, resourceId, limit]
    );
    return result.rows;
  }
}

