import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Comprehensive security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none'; " +
      "form-action 'self'; " +
      "base-uri 'self'; " +
      "object-src 'none'"
    );
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    // Additional security headers
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Set server header for security monitoring
    res.setHeader('Server', 'AyazLogistics-Security/1.0');

    next();
  }
}

@Injectable()
export class InputSanitizationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Sanitize request body
    if (req.body) {
      req.body = this.sanitize(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = this.sanitize(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = this.sanitize(req.params);
    }

    next();
  }

  private sanitize(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item));
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = this.sanitize(obj[key]);
      }
    }

    return sanitized;
  }

  private sanitizeString(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // Comprehensive XSS and injection protection
    return value
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove iframe tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      // Remove object/embed tags
      .replace(/<(object|embed|applet|meta)\b[^>]*>/gi, '')
      // Remove javascript: and other URI schemes
      .replace(/\b(javascript|vbscript|data|file):/gi, '')
      // Remove event handlers
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '')
      // Remove potentially dangerous attributes
      .replace(/\s*(href|src)\s*=\s*["']\s*javascript:/gi, '')
      // Remove HTML comments that might contain scripts
      .replace(/<!--[\s\S]*?-->/g, '')
      // Escape remaining HTML entities
      .replace(/[<>'"&]/g, (match) => {
        const escapeMap: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return escapeMap[match];
      })
      .trim();
  }
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { method, originalUrl, ip } = req;
      const { statusCode } = res;

      console.log(
        `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`
      );
    });

    next();
  }
}

@Injectable()
export class RequestSizeLimitMiddleware implements NestMiddleware {
  private readonly maxSize = 10 * 1024 * 1024; // 10MB default

  use(req: Request, res: Response, next: NextFunction) {
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;

      if (size > this.maxSize) {
        req.destroy(new Error('Request too large'));
        return;
      }
    });

    req.on('error', (err) => {
      if (err.message === 'Request too large') {
        res.status(413).json({
          statusCode: 413,
          message: 'Request entity too large',
          error: 'Payload Too Large',
        });
      }
    });

    next();
  }
}

@Injectable()
export class DdosProtectionMiddleware implements NestMiddleware {
  private readonly requestCounts = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequestsPerMinute = 1000;
  private readonly windowMs = 60000; // 1 minute

  use(req: Request, res: Response, next: NextFunction) {
    const ip = this.getClientIp(req);
    const now = Date.now();
    const key = `ddos:${ip}`;

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanupOldEntries(now);
    }

    let entry = this.requestCounts.get(key);

    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + this.windowMs };
      this.requestCounts.set(key, entry);
    } else if (entry.count >= this.maxRequestsPerMinute) {
      // Block suspicious IP temporarily
      return res.status(429).json({
        statusCode: 429,
        message: 'Too many requests from this IP address',
        error: 'Too Many Requests',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
    } else {
      entry.count++;
    }

    // Add security headers for DDoS tracking
    res.setHeader('X-Request-Count', entry.count.toString());

    next();
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private cleanupOldEntries(now: number) {
    for (const [key, entry] of this.requestCounts.entries()) {
      if (now > entry.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }
}

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['*'];
    const origin = req.headers.origin;

    if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  }
}