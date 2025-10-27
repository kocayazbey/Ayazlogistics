import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { EnhancedAuditService, AuditAction } from '../audit-enhanced.service';

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggingInterceptor.name);

  constructor(private readonly auditService: EnhancedAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers, body } = request;
    const startTime = Date.now();

    // Skip audit for health checks and metrics
    if (url.includes('/health') || url.includes('/metrics')) {
      return next.handle();
    }

    // Determine action based on HTTP method
    const action = this.mapMethodToAction(method);
    
    // Skip logging GET requests for non-sensitive data
    if (action === AuditAction.READ && !this.isSensitiveEndpoint(url)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (response) => {
        const duration = Date.now() - startTime;

        // Extract entity info from URL
        const entityInfo = this.extractEntityInfo(url, method);

        if (user && entityInfo.entity) {
          await this.auditService.log({
            userId: user.id,
            userName: user.name || user.email,
            tenantId: user.tenantId,
            action,
            entity: entityInfo.entity,
            entityId: entityInfo.entityId || 'bulk',
            changes: this.extractChanges(method, body, response),
            metadata: {
              ipAddress: this.getIP(request),
              userAgent: headers['user-agent'],
              method,
              endpoint: url,
              statusCode: context.switchToHttp().getResponse().statusCode,
              duration,
            },
            timestamp: new Date(),
            success: true,
          });
        }
      }),
      catchError(async (error) => {
        const duration = Date.now() - startTime;
        const entityInfo = this.extractEntityInfo(url, method);

        if (user && entityInfo.entity) {
          await this.auditService.log({
            userId: user.id,
            userName: user.name || user.email,
            tenantId: user.tenantId,
            action,
            entity: entityInfo.entity,
            entityId: entityInfo.entityId || 'unknown',
            metadata: {
              ipAddress: this.getIP(request),
              userAgent: headers['user-agent'],
              method,
              endpoint: url,
              statusCode: error.status || 500,
              duration,
            },
            timestamp: new Date(),
            success: false,
            errorMessage: error.message,
          });
        }

        throw error;
      }),
    );
  }

  private mapMethodToAction(method: string): AuditAction {
    const methodMap: Record<string, AuditAction> = {
      POST: AuditAction.CREATE,
      GET: AuditAction.READ,
      PUT: AuditAction.UPDATE,
      PATCH: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };

    return methodMap[method] || AuditAction.READ;
  }

  private extractEntityInfo(url: string, method: string): {
    entity: string;
    entityId?: string;
  } {
    // Parse URL to extract entity and ID
    // Example: /api/v1/customers/123 -> entity: customer, id: 123
    const parts = url.split('/').filter((p) => p && p !== 'api' && !p.startsWith('v'));
    
    if (parts.length === 0) {
      return { entity: 'unknown' };
    }

    const entity = parts[0];
    const entityId = parts.length > 1 && parts[1].match(/^[\w-]+$/) ? parts[1] : undefined;

    return { entity, entityId };
  }

  private extractChanges(method: string, body: any, response: any): any {
    if (method === 'POST') {
      return { after: this.sanitizeData(body) };
    } else if (method === 'PUT' || method === 'PATCH') {
      return {
        after: this.sanitizeData(body),
        // Note: 'before' data should be fetched from DB in actual implementation
      };
    } else if (method === 'DELETE') {
      return {
        before: this.sanitizeData(response),
      };
    }

    return null;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'privateKey'];
    const sanitized = { ...data };

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  private isSensitiveEndpoint(url: string): boolean {
    const sensitivePatterns = [
      '/customers',
      '/invoices',
      '/contracts',
      '/users',
      '/billing',
      '/financial',
    ];

    return sensitivePatterns.some((pattern) => url.includes(pattern));
  }

  private getIP(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0].trim() ||
      request.headers['x-real-ip'] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      request.ip
    );
  }
}

