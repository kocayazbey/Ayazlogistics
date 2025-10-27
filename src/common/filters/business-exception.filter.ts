import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';
import { ApiErrorResponse } from '../dto/response.dto';

@Catch(BusinessException)
export class BusinessExceptionFilter implements ExceptionFilter {
  catch(exception: BusinessException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorResponse = new ApiErrorResponse(
      exception.message,
      exception.errorCode,
      status,
      exception.details,
      request.url,
      request.method,
      (request as any).correlationId,
    );

    response.status(status).json(errorResponse);
  }
}

