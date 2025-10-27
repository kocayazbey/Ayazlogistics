import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { API_VERSION_KEY, DEPRECATED_KEY } from '../decorators/api-version.decorator';

@Injectable()
export class ApiVersionInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    
    const apiVersion = this.reflector.get<string>(API_VERSION_KEY, handler);
    const deprecated = this.reflector.get<any>(DEPRECATED_KEY, handler);
    
    if (apiVersion) {
      const clientVersion = request.headers['api-version'] || request.query.version;
      
      if (clientVersion && clientVersion !== apiVersion) {
        throw new BadRequestException(
          `API version mismatch. Expected: ${apiVersion}, Received: ${clientVersion}`
        );
      }
    }
    
    if (deprecated) {
      const warning = this.buildDeprecationWarning(deprecated);
      request.headers['deprecation-warning'] = warning;
    }
    
    return next.handle();
  }
  
  private buildDeprecationWarning(deprecated: any): string {
    let warning = 'This API endpoint is deprecated';
    
    if (deprecated.since) {
      warning += ` since ${deprecated.since}`;
    }
    
    if (deprecated.sunset) {
      warning += ` and will be removed on ${deprecated.sunset}`;
    }
    
    return warning;
  }
}
