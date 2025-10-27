import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CspMiddleware implements NestMiddleware {
  private readonly logger = new Logger('CspMiddleware');

  use(req: Request, res: Response, next: NextFunction) {
    // Set Content Security Policy headers
    const cspHeader = this.buildCspHeader(req);
    res.setHeader('Content-Security-Policy', cspHeader);
    
    // Set other security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    this.logger.debug('CSP headers set');
    next();
  }

  private buildCspHeader(req: Request): string {
    const isReportOnly = process.env.CSP_REPORT_ONLY === 'true';
    const directive = isReportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
    
    const policies = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.sentry.io https://*.sentry.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ];

    if (isReportOnly) {
      policies.push(`report-uri ${req.protocol}://${req.get('host')}/api/csp-report`);
    }

    return policies.join('; ');
  }
}
