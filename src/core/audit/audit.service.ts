import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Audit Service
 * Comprehensive audit logging for critical operations
 * Stores logs in database and file system for compliance
 */

export interface AuditLog {
  id: string;
  timestamp: Date;
  tenantId?: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  method: string;
  url: string;
  ip: string;
  userAgent?: string;
  requestData?: any;
  responseData?: any;
  statusCode: number;
  success: boolean;
  duration?: number;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  reason?: string;
  approvedBy?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private auditLogs: Map<string, AuditLog> = new Map();
  private auditFilePath: string;

  constructor(private eventEmitter: EventEmitter2) {
    this.auditFilePath = path.join(process.cwd(), 'logs', 'audit');
    this.ensureAuditDirectory();
  }

  private ensureAuditDirectory(): void {
    if (!fs.existsSync(this.auditFilePath)) {
      fs.mkdirSync(this.auditFilePath, { recursive: true });
    }
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const auditLog: AuditLog = {
      ...log,
      id: `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    // Store in memory
    this.auditLogs.set(auditLog.id, auditLog);

    // Write to file system (daily rotation)
    await this.writeToFile(auditLog);

    // Emit event for real-time monitoring
    await this.eventEmitter.emitAsync('audit.log.created', auditLog);

    // Alert on critical actions
    if (this.isCriticalAction(auditLog.action)) {
      await this.eventEmitter.emitAsync('audit.critical.action', auditLog);
    }

    return auditLog;
  }

  /**
   * Listen to audit log creation events
   */
  @OnEvent('audit.log.created')
  async handleAuditLogCreated(log: AuditLog): Promise<void> {
    // Store in database in real implementation
    console.log('Audit log created:', log.action, 'by', log.userName);
  }

  /**
   * Write audit log to file
   */
  private async writeToFile(log: AuditLog): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const fileName = `audit-${date}.log`;
    const filePath = path.join(this.auditFilePath, fileName);

    const logEntry = JSON.stringify(log) + '\n';

    fs.appendFileSync(filePath, logEntry);
  }

  /**
   * Check if action is critical
   */
  private isCriticalAction(action: string): boolean {
    const criticalActions = [
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_CREATED',
      'USER_DELETED',
      'USER_ROLE_CHANGED',
      'SUPERVISOR_OVERRIDE',
      'PARAMETER_CHANGE',
      'BILLING_OPERATION',
      'FINANCIAL_OPERATION',
      'SECURITY_SETTINGS_CHANGE',
      'DATA_EXPORT',
      'DATA_IMPORT',
      'BULK_DELETE',
    ];

    return criticalActions.includes(action);
  }

  /**
   * Query audit logs
   */
  async queryAuditLogs(filters: {
    userId?: string;
    action?: string;
    module?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
  }): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogs.values());

    if (filters.userId) {
      logs = logs.filter((log) => log.userId === filters.userId);
    }

    if (filters.action) {
      logs = logs.filter((log) => log.action === filters.action);
    }

    if (filters.module) {
      logs = logs.filter((log) => log.module === filters.module);
    }

    if (filters.startDate) {
      logs = logs.filter((log) => log.timestamp >= filters.startDate);
    }

    if (filters.endDate) {
      logs = logs.filter((log) => log.timestamp <= filters.endDate);
    }

    if (filters.success !== undefined) {
      logs = logs.filter((log) => log.success === filters.success);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(period: 'today' | 'week' | 'month'): Promise<{
    totalLogs: number;
    successRate: number;
    topActions: Array<{ action: string; count: number }>;
    topUsers: Array<{ userId: string; userName: string; count: number }>;
    failedOperations: number;
  }> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const logs = await this.queryAuditLogs({ startDate });

    const totalLogs = logs.length;
    const successfulLogs = logs.filter((log) => log.success).length;
    const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0;

    // Count actions
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Count users
    const userCounts = logs.reduce((acc, log) => {
      const key = `${log.userId}:${log.userName}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topUsers = Object.entries(userCounts)
      .map(([key, count]) => {
        const [userId, userName] = key.split(':');
        return { userId, userName, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const failedOperations = logs.filter((log) => !log.success).length;

    return {
      totalLogs,
      successRate: Math.round(successRate * 100) / 100,
      topActions,
      topUsers,
      failedOperations,
    };
  }

  /**
   * Export audit logs to file
   */
  async exportAuditLogs(filters: {
    startDate: Date;
    endDate: Date;
    format?: 'json' | 'csv';
  }): Promise<string> {
    const logs = await this.queryAuditLogs({
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    const format = filters.format || 'json';
    const fileName = `audit-export-${Date.now()}.${format}`;
    const filePath = path.join(this.auditFilePath, 'exports', fileName);

    // Ensure export directory exists
    const exportDir = path.join(this.auditFilePath, 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    if (format === 'json') {
      fs.writeFileSync(filePath, JSON.stringify(logs, null, 2));
    } else if (format === 'csv') {
      const csv = this.convertToCSV(logs);
      fs.writeFileSync(filePath, csv);
    }

    return filePath;
  }

  /**
   * Convert audit logs to CSV format
   */
  private convertToCSV(logs: AuditLog[]): string {
    if (logs.length === 0) return '';

    const headers = ['Timestamp', 'User', 'Action', 'Module', 'Method', 'URL', 'Status', 'Success', 'IP'];
    const rows = logs.map((log) => [
      log.timestamp.toISOString(),
      log.userName,
      log.action,
      log.module,
      log.method,
      log.url,
      log.statusCode,
      log.success ? 'Yes' : 'No',
      log.ip,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

    return csvContent;
  }

  /**
   * Clean up old audit logs (retention policy)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [id, log] of this.auditLogs.entries()) {
      if (log.timestamp < cutoffDate) {
        this.auditLogs.delete(id);
        deletedCount++;
      }
    }

    await this.eventEmitter.emitAsync('audit.cleanup.completed', {
      deletedCount,
      retentionDays,
      cutoffDate,
    });

    return deletedCount;
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId: string, days: number = 7): Promise<{
    totalActions: number;
    successRate: number;
    topActions: Array<{ action: string; count: number }>;
    lastActivity: Date;
    failedAttempts: number;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logs = await this.queryAuditLogs({ userId, startDate });

    const totalActions = logs.length;
    const successfulActions = logs.filter((log) => log.success).length;
    const successRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 0;

    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const lastActivity = logs.length > 0 ? logs[0].timestamp : new Date(0);
    const failedAttempts = logs.filter((log) => !log.success).length;

    return {
      totalActions,
      successRate: Math.round(successRate * 100) / 100,
      topActions,
      lastActivity,
      failedAttempts,
    };
  }
}

