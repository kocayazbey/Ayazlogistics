import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RateLimitStrictGuard implements CanActivate {
  private readonly limits = new Map<string, { count: number; resetTime: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const endpoint = request.route?.path || request.url;
    const isLogin = endpoint.includes('/auth/login');
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    
    const key = `${request.ip}:${endpoint}`;
    const now = Date.now();
    const windowMs = isLogin ? 60000 : isWrite ? 300000 : 60000; // 1min for login, 5min for write, 1min for read
    const maxRequests = isLogin ? 5 : isWrite ? 10 : 100;
    
    const current = this.limits.get(key);
    
    if (!current || now > current.resetTime) {
      this.limits.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (current.count >= maxRequests) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    
    current.count++;
    return true;
  }
}
