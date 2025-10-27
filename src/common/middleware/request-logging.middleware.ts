import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('User-Agent') || '';
    const startTime = Date.now();

    // Log request
    this.logger.log(
      `Incoming Request: ${method} ${originalUrl} - IP: ${ip} - User-Agent: ${userAgent}`
    );

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      
      // Log response
      this.logger.log(
        `Outgoing Response: ${method} ${originalUrl} - Status: ${statusCode} - Duration: ${duration}ms`
      );

      // Log slow requests
      if (duration > 1000) {
        this.logger.warn(
          `Slow Request: ${method} ${originalUrl} - Duration: ${duration}ms`
        );
      }

      // Log errors
      if (statusCode >= 400) {
        this.logger.error(
          `Error Response: ${method} ${originalUrl} - Status: ${statusCode} - Duration: ${duration}ms`
        );
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  }
}
