import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { SECURITY_KEY, SECURITY_OPTIONS_KEY } from '../decorators/security.decorator';
import { Logger } from '@nestjs/common';

@Injectable()
export class ComprehensiveSecurityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ComprehensiveSecurityInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const isSecurityEnabled = this.reflector.get<boolean>(SECURITY_KEY, context.getHandler());
    const options = this.reflector.get<any>(SECURITY_OPTIONS_KEY, context.getHandler());
    
    if (!isSecurityEnabled) {
      return next.handle();
    }

    // Security validations
    this.validateSecurityRequirements(request, options);
    
    const startTime = Date.now();
    const user = request.user;
    const tenantId = user?.tenantId;
    const userId = user?.id;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap((data) => {
        const executionTime = Date.now() - startTime;
        
        // Log security event
        this.logSecurityEvent({
          type: 'SUCCESS',
          user: { id: userId, tenantId },
          request: {
            method: request.method,
            url: request.url,
            ip,
            userAgent,
          },
          response: {
            statusCode: response.statusCode,
            dataSize: JSON.stringify(data).length,
          },
          executionTime,
          timestamp: new Date(),
        });
      }),
      catchError((error) => {
        const executionTime = Date.now() - startTime;
        
        // Log security event for errors
        this.logSecurityEvent({
          type: 'ERROR',
          user: { id: userId, tenantId },
          request: {
            method: request.method,
            url: request.url,
            ip,
            userAgent,
          },
          error: {
            message: error.message,
            statusCode: error.status || 500,
          },
          executionTime,
          timestamp: new Date(),
        });
        
        throw error;
      }),
    );
  }

  private validateSecurityRequirements(request: any, options: any) {
    // HTTPS validation
    if (options?.requireHttps && request.protocol !== 'https') {
      throw new HttpException('HTTPS required', HttpStatus.FORBIDDEN);
    }

    // Authentication validation
    if (options?.requireAuth && !request.user) {
      throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
    }

    // Input sanitization
    if (options?.sanitizeInput) {
      this.sanitizeRequestInput(request);
    }

    // XSS protection
    if (options?.xssProtection) {
      this.validateXSSProtection(request);
    }

    // SQL injection protection
    if (options?.sqlInjectionProtection) {
      this.validateSQLInjectionProtection(request);
    }
  }

  private sanitizeRequestInput(request: any) {
    if (request.body) {
      request.body = this.sanitizeObject(request.body);
    }
    if (request.query) {
      request.query = this.sanitizeObject(request.query);
    }
    if (request.params) {
      request.params = this.sanitizeObject(request.params);
    }
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = this.sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    return obj;
  }

  private validateXSSProtection(request: any) {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    ];

    const checkForXSS = (obj: any): boolean => {
      if (typeof obj === 'string') {
        return xssPatterns.some(pattern => pattern.test(obj));
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(value => checkForXSS(value));
      }
      return false;
    };

    if (checkForXSS(request.body) || checkForXSS(request.query) || checkForXSS(request.params)) {
      throw new HttpException('XSS attack detected', HttpStatus.BAD_REQUEST);
    }
  }

  private validateSQLInjectionProtection(request: any) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(\b(OR|AND)\b.*\b(OR|AND)\b)/gi,
      /(\b(OR|AND)\b.*=.*\b(OR|AND)\b)/gi,
      /(\b(OR|AND)\b.*'.*'.*)/gi,
      /(\b(OR|AND)\b.*".*".*)/gi,
    ];

    const checkForSQLInjection = (obj: any): boolean => {
      if (typeof obj === 'string') {
        return sqlPatterns.some(pattern => pattern.test(obj));
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(value => checkForSQLInjection(value));
      }
      return false;
    };

    if (checkForSQLInjection(request.body) || checkForSQLInjection(request.query) || checkForSQLInjection(request.params)) {
      throw new HttpException('SQL injection attack detected', HttpStatus.BAD_REQUEST);
    }
  }

  private logSecurityEvent(event: any) {
    this.logger.log(`[SECURITY EVENT] ${JSON.stringify(event)}`);
  }
}
