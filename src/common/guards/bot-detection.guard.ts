import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class BotDetectionGuard implements CanActivate {
  private readonly botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /php/i,
    /node/i,
    /go-http/i,
    /okhttp/i,
    /apache/i,
    /nginx/i,
  ];

  private readonly suspiciousPatterns = [
    /\.\.\//,
    /<script/i,
    /union.*select/i,
    /drop.*table/i,
    /insert.*into/i,
    /delete.*from/i,
    /exec\(/i,
    /eval\(/i,
    /javascript:/i,
    /vbscript:/i,
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Check User-Agent for bot patterns
    const userAgent = request.headers['user-agent'] || '';
    if (this.isBot(userAgent)) {
      throw new ForbiddenException('Bot access not allowed');
    }

    // Check for suspicious request patterns
    if (this.isSuspicious(request)) {
      throw new ForbiddenException('Suspicious request detected');
    }

    // Check for rate limiting violations
    if (this.isRateLimited(request)) {
      throw new ForbiddenException('Rate limit exceeded');
    }

    return true;
  }

  private isBot(userAgent: string): boolean {
    return this.botPatterns.some(pattern => pattern.test(userAgent));
  }

  private isSuspicious(request: Request): boolean {
    const url = request.url;
    const body = JSON.stringify(request.body || {});
    const query = JSON.stringify(request.query || {});

    return this.suspiciousPatterns.some(pattern => 
      pattern.test(url) || pattern.test(body) || pattern.test(query)
    );
  }

  private isRateLimited(request: Request): boolean {
    // This would integrate with your rate limiting service
    // For now, return false (no rate limiting)
    return false;
  }
}
