import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  tenantId?: string;
  action: string;
  resource: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  requestBody?: any;
  responseStatus?: number;
  duration?: number;
  changes?: any;
  metadata?: any;
}

const CRITICAL_OPERATIONS = [
  '/auth/login',
  '/auth/logout',
  '/auth/register',
  '/users/delete',
  '/users/update',
  '/settings/update',
  '/billing/generate-invoice',
  '/warehouse/transfer',
  '/inventory/adjust',
  '/financial/transaction',
];

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  constructor(
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const user = (req as any).user;

    // Capture original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function (data: any): Response {
      res.send = originalSend;

      const duration = Date.now() - startTime;
      const shouldLog = this.shouldLogRequest(req, res.statusCode);

      if (shouldLog) {
        this.logAudit(req, res, user, duration).catch(error => {
          console.error('Audit log error:', error);
        });
      }

      return res.send(data);
    }.bind(this);

    next();
  }

  private shouldLogRequest(req: Request, statusCode: number): boolean {
    // Always log critical operations
    if (CRITICAL_OPERATIONS.some(op => req.path.includes(op))) {
      return true;
    }

    // Log all mutations (POST, PUT, PATCH, DELETE)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return true;
    }

    // Log failed requests (4xx, 5xx)
    if (statusCode >= 400) {
      return true;
    }

    // Skip GET requests for non-sensitive resources
    if (req.method === 'GET' && !this.isSensitiveResource(req.path)) {
      return false;
    }

    return true;
  }

  private isSensitiveResource(path: string): boolean {
    const sensitiveResources = [
      '/users',
      '/auth',
      '/settings',
      '/financial',
      '/billing',
      '/admin',
    ];

    return sensitiveResources.some(resource => path.includes(resource));
  }

  private async logAudit(req: Request, res: Response, user: any, duration: number) {
    const auditLog: AuditLog = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      userId: user?.id,
      tenantId: user?.tenantId,
      action: this.extractAction(req),
      resource: this.extractResource(req),
      method: req.method,
      path: req.path,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      requestBody: this.sanitizeRequestBody(req.body),
      responseStatus: res.statusCode,
      duration,
      metadata: {
        query: req.query,
        params: req.params,
      },
    };

    // Store in Redis for quick access (30 days TTL)
    const key = `audit:${auditLog.tenantId}:${auditLog.id}`;
    await this.redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(auditLog));

    // Add to tenant's audit log list
    const listKey = `audit:list:${auditLog.tenantId}`;
    await this.redis.lpush(listKey, auditLog.id);
    await this.redis.ltrim(listKey, 0, 9999); // Keep last 10,000 logs

    // Store in time-series for analytics
    const dateKey = `audit:date:${auditLog.tenantId}:${this.getDateKey(new Date())}`;
    await this.redis.incr(dateKey);
    await this.redis.expire(dateKey, 90 * 24 * 60 * 60); // 90 days

    // Store critical operations separately
    if (this.isCriticalOperation(req.path)) {
      const criticalKey = `audit:critical:${auditLog.tenantId}:${auditLog.id}`;
      await this.redis.setex(criticalKey, 365 * 24 * 60 * 60, JSON.stringify(auditLog)); // 1 year
    }

    // Emit event for real-time monitoring
    if (res.statusCode >= 400 || this.isCriticalOperation(req.path)) {
      this.emitAuditEvent(auditLog);
    }
  }

  private extractAction(req: Request): string {
    const methodActionMap: Record<string, string> = {
      GET: 'read',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };

    return methodActionMap[req.method] || 'unknown';
  }

  private extractResource(req: Request): string {
    const pathParts = req.path.split('/').filter(Boolean);
    return pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1] || 'unknown';
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return undefined;

    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private isCriticalOperation(path: string): boolean {
    return CRITICAL_OPERATIONS.some(op => path.includes(op));
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private emitAuditEvent(log: AuditLog) {
    // In production, emit to event bus for real-time monitoring
    console.log('Audit Event:', {
      action: log.action,
      resource: log.resource,
      userId: log.userId,
      status: log.responseStatus,
    });
  }
}

// Service to query audit logs
export class AuditLogService {
  constructor(private readonly redis: Redis) {}

  async getAuditLogs(tenantId: string, filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    const listKey = `audit:list:${tenantId}`;
    const limit = filters?.limit || 100;
    
    const auditIds = await this.redis.lrange(listKey, 0, limit - 1);
    const logs: AuditLog[] = [];

    for (const id of auditIds) {
      const key = `audit:${tenantId}:${id}`;
      const data = await this.redis.get(key);
      
      if (data) {
        const log = JSON.parse(data);
        
        // Apply filters
        if (filters?.userId && log.userId !== filters.userId) continue;
        if (filters?.action && log.action !== filters.action) continue;
        if (filters?.resource && log.resource !== filters.resource) continue;
        
        logs.push(log);
      }
    }

    return logs;
  }

  async getCriticalOperations(tenantId: string, limit: number = 50): Promise<AuditLog[]> {
    const pattern = `audit:critical:${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    const logs: AuditLog[] = [];

    for (const key of keys.slice(0, limit)) {
      const data = await this.redis.get(key);
      if (data) {
        logs.push(JSON.parse(data));
      }
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getAuditStatistics(tenantId: string, days: number = 7): Promise<any> {
    const stats: any = {
      totalOperations: 0,
      byAction: {},
      byResource: {},
      byDay: {},
    };

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const key = `audit:date:${tenantId}:${dateKey}`;
      const count = await this.redis.get(key);
      
      if (count) {
        stats.totalOperations += parseInt(count, 10);
        stats.byDay[dateKey] = parseInt(count, 10);
      }
    }

    return stats;
  }
}
