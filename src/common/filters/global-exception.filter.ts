import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let details: any = null;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse.message;
      errorCode = exceptionResponse.errorCode;
      details = exceptionResponse.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        errorCode = (exceptionResponse as any).errorCode || 'HTTP_ERROR';
        details = (exceptionResponse as any).details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorCode = 'UNKNOWN_ERROR';
    }

    // Sanitize error messages in production
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && status >= 500) {
      // Don't expose internal error details in production
      message = 'An internal server error occurred';
      details = null;
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      errorCode,
      details: isProduction && status >= 500 ? null : details,
      requestId: request.headers['x-request-id'] || null,
    };

    // Log the error
    this.logError(exception, errorResponse, request);

    response.status(status).json(errorResponse);
  }

  private logError(exception: unknown, errorResponse: any, request: Request) {
    const logContext = {
      url: request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: (request as any).user?.id,
    };

    if (exception instanceof BusinessException) {
      this.logger.warn(
        `Business Exception: ${errorResponse.message}`,
        JSON.stringify({ ...errorResponse, ...logContext })
      );
    } else if (exception instanceof HttpException) {
      this.logger.warn(
        `HTTP Exception: ${errorResponse.message}`,
        JSON.stringify({ ...errorResponse, ...logContext })
      );
    } else {
      this.logger.error(
        `Unhandled Exception: ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : String(exception),
        JSON.stringify({ ...errorResponse, ...logContext })
      );
    }
  }
}