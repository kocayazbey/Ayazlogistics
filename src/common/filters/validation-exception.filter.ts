import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    const errors = exceptionResponse.message;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: (request as any).url,
      error: 'Validation Error',
      message: 'Validation failed',
      details: Array.isArray(errors) ? errors : [errors],
    });
  }
}

