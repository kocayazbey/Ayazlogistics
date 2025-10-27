import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class OwaspCrsMiddleware implements NestMiddleware {
  private readonly logger = new Logger('OwaspCrsMiddleware');

  use(req: Request, res: Response, next: NextFunction) {
    // SQL Injection protection
    if (this.containsSqlInjection(req)) {
      this.logger.warn(`SQL injection attempt blocked from ${req.ip}`);
      return res.status(400).json({ error: 'Invalid request' });
    }

    // XSS protection
    if (this.containsXss(req)) {
      this.logger.warn(`XSS attempt blocked from ${req.ip}`);
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Path traversal protection
    if (this.containsPathTraversal(req)) {
      this.logger.warn(`Path traversal attempt blocked from ${req.ip}`);
      return res.status(400).json({ error: 'Invalid request' });
    }

    next();
  }

  private containsSqlInjection(req: Request): boolean {
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+set/i,
      /or\s+1\s*=\s*1/i,
      /and\s+1\s*=\s*1/i
    ];

    const searchString = JSON.stringify(req.body) + req.url + JSON.stringify(req.query);
    return sqlPatterns.some(pattern => pattern.test(searchString));
  }

  private containsXss(req: Request): boolean {
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    const searchString = JSON.stringify(req.body) + req.url + JSON.stringify(req.query);
    return xssPatterns.some(pattern => pattern.test(searchString));
  }

  private containsPathTraversal(req: Request): boolean {
    const pathTraversalPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i
    ];

    return pathTraversalPatterns.some(pattern => pattern.test(req.url));
  }
}
