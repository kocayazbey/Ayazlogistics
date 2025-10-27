import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EnhancedAuditService } from '../../core/audit/audit-enhanced.service';
import { AUDIT_METADATA } from '../../common/decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: EnhancedAuditService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const auditOptions = this.reflector.get<any>(
      AUDIT_METADATA,
      context.getHandler(),
    );

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;
    const method = request.method;
    const url = request.url;
    const ipAddress = request.ip;
    const userAgent = request.get('User-Agent');

    // Extract resource ID from request
    const resourceId = this.extractResourceId(request, auditOptions.resource);

    return next.handle().pipe(
      tap({
        next: async (data) => {
          try {
            await this.auditService.logUserAction(
              auditOptions.action,
              auditOptions.resource,
              resourceId,
              user?.id || 'anonymous',
              user?.tenantId || 'default',
              {
                method,
                url,
                timestamp: new Date().toISOString(),
                ...(auditOptions.logMetadata && { metadata: request.body }),
              },
              ipAddress,
              userAgent,
            );
          } catch (error) {
            // Don't fail the request if audit logging fails
            console.error('Audit logging failed:', error);
          }
        },
        error: async (error) => {
          try {
            await this.auditService.logUserAction(
              `${auditOptions.action}_FAILED`,
              auditOptions.resource,
              resourceId,
              user?.id || 'anonymous',
              user?.tenantId || 'default',
              {
                method,
                url,
                error: error.message,
                timestamp: new Date().toISOString(),
              },
              ipAddress,
              userAgent,
            );
          } catch (auditError) {
            // Don't fail the request if audit logging fails
            console.error('Audit logging failed:', auditError);
          }
        },
      }),
    );
  }

  private extractResourceId(request: any, resource: string): string {
    // Try to extract resource ID from various sources
    const params = request.params || {};
    const body = request.body || {};
    
    // Common ID field names
    const idFields = ['id', 'resourceId', `${resource}Id`, `${resource.toLowerCase()}Id`];
    
    for (const field of idFields) {
      if (params[field]) {
        return params[field];
      }
      if (body[field]) {
        return body[field];
      }
    }
    
    // Fallback to route parameter
    return params.id || 'unknown';
  }
}
