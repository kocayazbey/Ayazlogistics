import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditPiiRedactionInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditPiiRedactionInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Redact PII from request body
    if (request.body) {
      request.body = this.redactPii(request.body);
    }

    return next.handle().pipe(
      tap((response) => {
        // Redact PII from response
        const redactedResponse = this.redactPii(response);
        this.logger.debug('PII redacted from audit log');
      })
    );
  }

  private redactPii(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    const piiFields = ['email', 'phone', 'ssn', 'creditCard', 'password', 'token'];
    const redacted = { ...data };
    
    for (const field of piiFields) {
      if (redacted[field]) {
        redacted[field] = '[REDACTED]';
      }
    }
    
    return redacted;
  }
}
