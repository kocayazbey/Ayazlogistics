import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AUDIT_ACTION_KEY, AUDIT_RESOURCE_KEY, AUDIT_LEVEL_KEY, AuditLevel } from '../decorators/audit.decorator';
import { Logger } from '@nestjs/common';

@Injectable()
export class ComprehensiveAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ComprehensiveAuditInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const action = this.reflector.get<string>(AUDIT_ACTION_KEY, context.getHandler());
    const resource = this.reflector.get<string>(AUDIT_RESOURCE_KEY, context.getHandler());
    const level = this.reflector.get<AuditLevel>(AUDIT_LEVEL_KEY, context.getHandler());
    
    const startTime = Date.now();
    const user = request.user;
    const tenantId = user?.tenantId;
    const userId = user?.id;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];
    const requestId = request.headers['x-request-id'] || this.generateRequestId();

    return next.handle().pipe(
      tap((data) => {
        const executionTime = Date.now() - startTime;
        this.logAuditEvent({
          action,
          resource,
          level,
          status: 'SUCCESS',
          executionTime,
          user: { id: userId, tenantId },
          request: {
            method: request.method,
            url: request.url,
            ip,
            userAgent,
            requestId,
          },
          response: {
            statusCode: response.statusCode,
            dataSize: JSON.stringify(data).length,
          },
          timestamp: new Date(),
        });
      }),
      catchError((error) => {
        const executionTime = Date.now() - startTime;
        this.logAuditEvent({
          action,
          resource,
          level,
          status: 'ERROR',
          executionTime,
          user: { id: userId, tenantId },
          request: {
            method: request.method,
            url: request.url,
            ip,
            userAgent,
            requestId,
          },
          error: {
            message: error.message,
            stack: error.stack,
            statusCode: error.status || 500,
          },
          timestamp: new Date(),
        });
        throw error;
      }),
    );
  }

  private logAuditEvent(auditData: any) {
    if (auditData.level === AuditLevel.COMPREHENSIVE) {
      this.logger.log(`[COMPREHENSIVE AUDIT] ${JSON.stringify(auditData)}`);
    } else if (auditData.level === AuditLevel.DETAILED) {
      this.logger.log(`[DETAILED AUDIT] ${JSON.stringify(auditData)}`);
    } else {
      this.logger.log(`[BASIC AUDIT] ${auditData.action} on ${auditData.resource} - ${auditData.status}`);
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
