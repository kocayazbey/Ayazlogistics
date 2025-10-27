import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * WMS Exception Filter
 * Provides consistent error responses for WMS operations
 */
@Catch()
export class WmsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('WMS-Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'WMS_ERROR';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        details = (exceptionResponse as any).error;
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      message = exception.message;

      // Map specific WMS errors
      if (message.includes('not found')) {
        status = HttpStatus.NOT_FOUND;
        errorCode = 'WMS_RESOURCE_NOT_FOUND';
      } else if (message.includes('Insufficient')) {
        status = HttpStatus.BAD_REQUEST;
        errorCode = 'WMS_INSUFFICIENT_INVENTORY';
      } else if (message.includes('already exists')) {
        status = HttpStatus.CONFLICT;
        errorCode = 'WMS_DUPLICATE_RESOURCE';
      } else if (message.includes('No available')) {
        status = HttpStatus.BAD_REQUEST;
        errorCode = 'WMS_NO_AVAILABLE_LOCATION';
      }
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      errorCode,
      message,
      details,
      requestId: request.headers['x-request-id'] || this.generateRequestId(),
    };

    // Log error with appropriate level
    if (status >= 500) {
      this.logger.error(
        `WMS Error: ${request.method} ${request.url} - ${message}`,
        exception instanceof Error ? exception.stack : undefined
      );
    } else if (status >= 400) {
      this.logger.warn(
        `WMS Warning: ${request.method} ${request.url} - ${message}`
      );
    }

    response.status(status).json(errorResponse);
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

