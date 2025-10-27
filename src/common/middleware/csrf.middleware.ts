import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * CSRF Protection Middleware
 * Implements CSRF token generation and validation
 */

@Injectable()
export class CSRFMiddleware implements NestMiddleware {
  private readonly tokenSecret = process.env.CSRF_SECRET || 'ayazlogistics-csrf-secret-key-2025';
  private readonly cookieName = 'XSRF-TOKEN';
  private readonly headerName = 'X-XSRF-TOKEN';
  private readonly safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  use(req: Request, res: Response, next: NextFunction): void {
    // Skip CSRF for safe methods
    if (this.safeMethods.includes(req.method)) {
      return next();
    }

    // Skip CSRF for API endpoints that use Bearer token
    if (req.headers.authorization?.startsWith('Bearer ')) {
      return next();
    }

    // Generate token if not exists
    if (!req.cookies[this.cookieName]) {
      const token = this.generateToken();
      res.cookie(this.cookieName, token, {
        httpOnly: false, // Must be accessible to JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000, // 1 hour
      });
    }

    // Validate token for state-changing requests
    const cookieToken = req.cookies[this.cookieName];
    const headerToken = req.headers[this.headerName.toLowerCase()];

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException({
        message: 'CSRF token missing',
        messageTr: 'CSRF token eksik',
        code: 'CSRF_MISSING',
      });
    }

    if (cookieToken !== headerToken) {
      throw new ForbiddenException({
        message: 'CSRF token mismatch',
        messageTr: 'CSRF token uyuşmuyor',
        code: 'CSRF_INVALID',
      });
    }

    // Verify token signature
    if (!this.verifyToken(cookieToken)) {
      throw new ForbiddenException({
        message: 'CSRF token invalid',
        messageTr: 'CSRF token geçersiz',
        code: 'CSRF_INVALID',
      });
    }

    next();
  }

  private generateToken(): string {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac('sha256', this.tokenSecret)
      .update(randomBytes + timestamp)
      .digest('hex');
    
    return `${randomBytes}.${timestamp}.${signature}`;
  }

  private verifyToken(token: string): boolean {
    try {
      const [randomBytes, timestamp, signature] = token.split('.');
      
      // Check token age (max 1 hour)
      const tokenAge = Date.now() - parseInt(timestamp, 10);
      if (tokenAge > 3600000) {
        return false;
      }

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.tokenSecret)
        .update(randomBytes + timestamp)
        .digest('hex');

      return signature === expectedSignature;
    } catch {
      return false;
    }
  }
}

