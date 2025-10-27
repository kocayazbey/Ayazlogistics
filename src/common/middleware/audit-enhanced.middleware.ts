import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DRIZZLE_ORM } from '../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { auditLogs } from '../../database/schema/core/audit.schema';

interface AuditLogEntry {
  tenantId?: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  endpoint: string;
  ip: string;
  userAgent: string;
  requestBody?: any;
  responseStatus: number;
  responseTime: number;
  changes?: any;
  metadata?: any;
}

@Injectable()
export class AuditEnhancedMiddleware implements NestMiddleware {
  private readonly AUDIT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
  private readonly CRITICAL_ENDPOINTS = [
    '/users',
    '/warehouses',
    '/vehicles',
    '/customers',
    '/documents',
    '/legal',
    '/billing',
    '/inventory',
    '/settings',
  ];

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    const shouldAudit = this.shouldAuditRequest(req);

    if (shouldAudit) {
      const originalSend = res.send;
      const originalJson = res.json;

      res.send = function (body: any) {
        res.locals.responseBody = body;
        return originalSend.call(this, body);
      };

      res.json = function (body: any) {
        res.locals.responseBody = body;
        return originalJson.call(this, body);
      };

      res.on('finish', async () => {
        const responseTime = Date.now() - startTime;

        try {
          await this.createAuditLog({
            tenantId: (req as any).user?.tenantId,
            userId: (req as any).user?.id,
            action: this.getAction(req.method, req.path),
            resource: this.getResource(req.path),
            resourceId: this.getResourceId(req.path),
            method: req.method,
            endpoint: req.path,
            ip: this.getClientIp(req),
            userAgent: req.get('user-agent') || 'unknown',
            requestBody: this.sanitizeBody(req.body),
            responseStatus: res.statusCode,
            responseTime,
            changes: this.extractChanges(req.body, res.locals.responseBody),
            metadata: {
              query: req.query,
              params: req.params,
              correlationId: (req as any).correlationId,
            },
          });
        } catch (error) {
          console.error('Audit log error:', error);
        }
      });
    }

    next();
  }

  private shouldAuditRequest(req: Request): boolean {
    if (this.AUDIT_METHODS.includes(req.method)) {
      return true;
    }

    const isCriticalEndpoint = this.CRITICAL_ENDPOINTS.some((endpoint) =>
      req.path.includes(endpoint),
    );

    return isCriticalEndpoint;
  }

  private async createAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.resource,
        entityId: entry.resourceId,
        changes: entry.changes || {},
        ipAddress: entry.ip,
        userAgent: entry.userAgent,
        metadata: {
          method: entry.method,
          endpoint: entry.endpoint,
          requestBody: entry.requestBody,
          responseStatus: entry.responseStatus,
          responseTime: entry.responseTime,
          ...entry.metadata,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  private getAction(method: string, path: string): string {
    switch (method) {
      case 'POST':
        return 'create';
      case 'PUT':
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      case 'GET':
        return 'read';
      default:
        return 'unknown';
    }
  }

  private getResource(path: string): string {
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 3) {
      return parts[2];
    }
    return 'unknown';
  }

  private getResourceId(path: string): string | undefined {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = path.match(uuidRegex);
    return match ? match[0] : undefined;
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return {};

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  private extractChanges(requestBody: any, responseBody: any): any {
    if (!requestBody) return {};

    const changes: any = {};
    Object.keys(requestBody).forEach((key) => {
      if (requestBody[key] !== undefined) {
        changes[key] = {
          old: null,
          new: requestBody[key],
        };
      }
    });

    return changes;
  }
}

