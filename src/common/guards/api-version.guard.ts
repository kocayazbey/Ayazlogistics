import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_VERSION_KEY, DEPRECATED_KEY } from '../decorators/api-version.decorator';

@Injectable()
export class ApiVersionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    
    const apiVersion = this.reflector.get<string>(API_VERSION_KEY, handler);
    const deprecated = this.reflector.get<any>(DEPRECATED_KEY, handler);
    
    if (!apiVersion) {
      return true;
    }
    
    const clientVersion = request.headers['api-version'] || request.query.version;
    
    if (!clientVersion) {
      throw new BadRequestException(
        'API version header is required. Use "api-version" header or "version" query parameter.'
      );
    }
    
    if (clientVersion !== apiVersion) {
      throw new BadRequestException(
        `Unsupported API version. Supported version: ${apiVersion}`
      );
    }
    
    if (deprecated) {
      const now = new Date();
      const sunsetDate = deprecated.sunset ? new Date(deprecated.sunset) : null;
      
      if (sunsetDate && now >= sunsetDate) {
        throw new GoneException(
          `This API endpoint has been removed as of ${deprecated.sunset}`
        );
      }
    }
    
    return true;
  }
}
