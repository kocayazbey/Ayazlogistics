import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AuditLog {
  id?: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ipAddress: string;
  userAgent: string;
  requestBody?: any;
  responseStatus: number;
  timestamp: Date;
  duration?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditLoggingService {
  private readonly logger = new Logger(AuditLoggingService.name);
  private auditLogs: AuditLog[] = [];

  constructor(private configService: ConfigService) {}

  /**
   * Log an audit event
   */
  async log(auditLog: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const log: AuditLog = {
      ...auditLog,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.auditLogs.push(log);

    // Log to console in development
    if (this.configService.get('NODE_ENV') !== 'production') {
      this.logger.log(`Audit: ${log.action} on ${log.resource} by user ${log.userId}`);
    }

    // In production, you would save to database
    await this.saveToDatabase(log);
  }

  /**
   * Log a successful action
   */
  async logSuccess(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource,
      resourceId,
      method: 'POST',
      path: `/${resource}/${resourceId}`,
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      responseStatus: 200,
      metadata,
    });
  }

  /**
   * Log a failed action
   */
  async logFailure(
    userId: string,
    action: string,
    resource: string,
    error: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource,
      method: 'POST',
      path: `/${resource}`,
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      responseStatus: 500,
      metadata: {
        ...metadata,
        error,
      },
    });
  }

  /**
   * Log authentication attempt
   */
  async logAuthAttempt(
    email: string,
    success: boolean,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.log({
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      resource: 'auth',
      method: 'POST',
      path: '/auth/login',
      ipAddress,
      userAgent,
      responseStatus: success ? 200 : 401,
      metadata: { email },
    });
  }

  /**
   * Log data access
   */
  async logDataAccess(
    userId: string,
    resource: string,
    resourceId: string,
    action: 'READ' | 'WRITE' | 'DELETE',
    ipAddress: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `DATA_${action}`,
      resource,
      resourceId,
      method: action === 'READ' ? 'GET' : action === 'DELETE' ? 'DELETE' : 'POST',
      path: `/${resource}/${resourceId}`,
      ipAddress,
      userAgent: 'system',
      responseStatus: 200,
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    event: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: `SECURITY_${event}`,
      resource: 'security',
      method: 'POST',
      path: '/security/event',
      ipAddress: details.ipAddress || '0.0.0.0',
      userAgent: details.userAgent || 'system',
      responseStatus: 200,
      metadata: {
        severity,
        ...details,
      },
    });

    // Alert on high/critical events
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      this.logger.error(`Security Event [${severity}]: ${event}`, details);
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.auditLogs
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get audit logs for a resource
   */
  async getResourceAuditLogs(
    resource: string,
    resourceId?: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    return this.auditLogs
      .filter((log) => {
        if (resourceId) {
          return log.resource === resource && log.resourceId === resourceId;
        }
        return log.resource === resource;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get security events
   */
  async getSecurityEvents(
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    limit: number = 100
  ): Promise<AuditLog[]> {
    return this.auditLogs
      .filter((log) => {
        if (severity) {
          return log.resource === 'security' && log.metadata?.severity === severity;
        }
        return log.resource === 'security';
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Search audit logs
   */
  async searchAuditLogs(
    criteria: Partial<AuditLog>,
    limit: number = 100
  ): Promise<AuditLog[]> {
    return this.auditLogs
      .filter((log) => {
        return Object.keys(criteria).every((key) => {
          return log[key] === criteria[key];
        });
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(): Promise<{
    total: number;
    byAction: Record<string, number>;
    byResource: Record<string, number>;
    byUser: Record<string, number>;
    recentEvents: AuditLog[];
  }> {
    const byAction: Record<string, number> = {};
    const byResource: Record<string, number> = {};
    const byUser: Record<string, number> = {};

    this.auditLogs.forEach((log) => {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byResource[log.resource] = (byResource[log.resource] || 0) + 1;
      if (log.userId) {
        byUser[log.userId] = (byUser[log.userId] || 0) + 1;
      }
    });

    return {
      total: this.auditLogs.length,
      byAction,
      byResource,
      byUser,
      recentEvents: this.auditLogs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10),
    };
  }

  /**
   * Clear old audit logs
   */
  async clearOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const initialCount = this.auditLogs.length;
    this.auditLogs = this.auditLogs.filter((log) => log.timestamp > cutoffDate);
    const removedCount = initialCount - this.auditLogs.length;

    this.logger.log(`Cleared ${removedCount} old audit logs`);
    return removedCount;
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditLog[]> {
    let logs = this.auditLogs;

    if (startDate) {
      logs = logs.filter((log) => log.timestamp >= startDate);
    }

    if (endDate) {
      logs = logs.filter((log) => log.timestamp <= endDate);
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save to database (placeholder)
   */
  private async saveToDatabase(log: AuditLog): Promise<void> {
    // In production, implement database save
    // For now, just keep in memory
  }
}
