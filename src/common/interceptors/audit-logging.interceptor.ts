import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLoggingService } from '../services/audit-logging.service';

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(private readonly auditLoggingService: AuditLoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const { method, url, body, user, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          
          // Log the request
          this.auditLoggingService.log({
            userId: user?.id,
            action: this.getActionFromMethod(method),
            resource: this.getResourceFromUrl(url),
            resourceId: this.getResourceIdFromUrl(url),
            method,
            path: url,
            ipAddress: ip,
            userAgent,
            requestBody: this.sanitizeBody(body),
            responseStatus: response.statusCode,
            duration,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          
          // Log the error
          this.auditLoggingService.log({
            userId: user?.id,
            action: this.getActionFromMethod(method),
            resource: this.getResourceFromUrl(url),
            resourceId: this.getResourceIdFromUrl(url),
            method,
            path: url,
            ipAddress: ip,
            userAgent,
            requestBody: this.sanitizeBody(body),
            responseStatus: error.status || 500,
            duration,
            metadata: {
              error: error.message,
              stack: error.stack,
            },
          });
        },
      })
    );
  }

  private getActionFromMethod(method: string): string {
    const methodMap = {
      GET: 'READ',
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    return methodMap[method] || 'UNKNOWN';
  }

  private getResourceFromUrl(url: string): string {
    // Extract resource from URL (e.g., /api/v1/wms/inventory -> wms/inventory)
    const parts = url.split('/').filter(Boolean);
    if (parts.length >= 3) {
      return `${parts[2]}/${parts[3] || ''}`.replace(/\/$/, '');
    }
    return 'unknown';
  }

  private getResourceIdFromUrl(url: string): string | undefined {
    // Extract resource ID from URL (e.g., /api/v1/wms/inventory/123 -> 123)
    const parts = url.split('/').filter(Boolean);
    if (parts.length >= 5) {
      return parts[4];
    }
    return undefined;
  }

  private sanitizeBody(body: any): any {
    if (!body) return undefined;

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
    const sanitized = { ...body };

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}
