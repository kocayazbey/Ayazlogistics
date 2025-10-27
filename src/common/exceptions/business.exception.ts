import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    message: string,
    errorCode: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: any
  ) {
    super(
      {
        message,
        errorCode,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode
    );
  }
}

export class ValidationException extends BusinessException {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', HttpStatus.BAD_REQUEST, details);
  }
}

export class NotFoundException extends BusinessException {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}

export class ConflictException extends BusinessException {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', HttpStatus.CONFLICT, details);
  }
}

export class UnauthorizedException extends BusinessException {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenException extends BusinessException {
  constructor(message: string = 'Access forbidden') {
    super(message, 'FORBIDDEN', HttpStatus.FORBIDDEN);
  }
}

export class RateLimitException extends BusinessException {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class ServiceUnavailableException extends BusinessException {
  constructor(service: string) {
    super(`${service} service is temporarily unavailable`, 'SERVICE_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export class DatabaseException extends BusinessException {
  constructor(operation: string, details?: any) {
    super(`Database operation failed: ${operation}`, 'DATABASE_ERROR', HttpStatus.INTERNAL_SERVER_ERROR, details);
  }
}

export class ExternalServiceException extends BusinessException {
  constructor(service: string, details?: any) {
    super(`External service error: ${service}`, 'EXTERNAL_SERVICE_ERROR', HttpStatus.BAD_GATEWAY, details);
  }
}