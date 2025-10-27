import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ErrorMonitoringService } from '../services/error-monitoring.service';

@Injectable()
export class ErrorLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ErrorLoggingMiddleware.name);

  constructor(private errorMonitoringService: ErrorMonitoringService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Add request ID to headers
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    // Log request start
    this.logger.log(
      `Request started: ${req.method} ${req.url}`,
      {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        userId: (req as any).user?.id,
      }
    );

    // Override response methods to capture errors
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function(body: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      if (statusCode >= 400) {
        ErrorLoggingMiddleware.prototype.logErrorResponse(
          req,
          res,
          statusCode,
          body,
          duration,
          requestId
        );
      } else {
        ErrorLoggingMiddleware.prototype.logSuccessResponse(
          req,
          res,
          statusCode,
          duration,
          requestId
        );
      }

      return originalSend.call(this, body);
    };

    res.json = function(body: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      if (statusCode >= 400) {
        ErrorLoggingMiddleware.prototype.logErrorResponse(
          req,
          res,
          statusCode,
          body,
          duration,
          requestId
        );
      } else {
        ErrorLoggingMiddleware.prototype.logSuccessResponse(
          req,
          res,
          statusCode,
          duration,
          requestId
        );
      }

      return originalJson.call(this, body);
    };

    // Handle uncaught errors
    res.on('error', (error: Error) => {
      this.errorMonitoringService.recordError(error, {
        service: 'HTTP',
        method: req.method,
        userId: (req as any).user?.id,
        requestId,
      });
    });

    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logErrorResponse(
    req: Request,
    res: Response,
    statusCode: number,
    body: any,
    duration: number,
    requestId: string
  ): void {
    this.logger.error(
      `Request failed: ${req.method} ${req.url} - ${statusCode}`,
      {
        requestId,
        method: req.method,
        url: req.url,
        statusCode,
        duration,
        errorBody: body,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        userId: (req as any).user?.id,
      }
    );
  }

  private logSuccessResponse(
    req: Request,
    res: Response,
    statusCode: number,
    duration: number,
    requestId: string
  ): void {
    this.logger.log(
      `Request completed: ${req.method} ${req.url} - ${statusCode} (${duration}ms)`,
      {
        requestId,
        method: req.method,
        url: req.url,
        statusCode,
        duration,
        userId: (req as any).user?.id,
      }
    );
  }
}
