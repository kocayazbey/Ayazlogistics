import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';

export function ApiSuccessResponse(description: string, type?: any) {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description,
      type,
    }),
  );
}

export function ApiCreatedResponse(description: string, type?: any) {
  return applyDecorators(
    ApiResponse({
      status: 201,
      description,
      type,
    }),
  );
}

export function ApiErrorResponses() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Bad Request - Validation failed or invalid input',
      schema: {
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Validation failed' },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing authentication token',
      schema: {
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Insufficient permissions',
      schema: {
        properties: {
          statusCode: { type: 'number', example: 403 },
          message: { type: 'string', example: 'Forbidden resource' },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found - Resource does not exist',
      schema: {
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Resource not found' },
        },
      },
    }),
    ApiResponse({
      status: 429,
      description: 'Too Many Requests - Rate limit exceeded',
      schema: {
        properties: {
          statusCode: { type: 'number', example: 429 },
          message: { type: 'string', example: 'Too many requests' },
          retryAfter: { type: 'number', example: 60 },
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
      schema: {
        properties: {
          statusCode: { type: 'number', example: 500 },
          message: { type: 'string', example: 'Internal server error' },
        },
      },
    }),
  );
}

export function ApiPaginatedResponse(description: string, type: any) {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description,
      schema: {
        properties: {
          items: {
            type: 'array',
            items: { $ref: `#/components/schemas/${type.name}` },
          },
          total: { type: 'number', example: 100 },
          page: { type: 'number', example: 1 },
          limit: { type: 'number', example: 10 },
          totalPages: { type: 'number', example: 10 },
        },
      },
    }),
  );
}

export function ApiStandardOperation(summary: string, description: string) {
  return applyDecorators(
    ApiOperation({ summary, description }),
    ApiErrorResponses(),
  );
}

export function ApiPaginationQueries() {
  return applyDecorators(
    ApiQuery({ name: 'page', required: false, type: Number, description: 'Sayfa numarası (varsayılan: 1)' }),
    ApiQuery({ name: 'limit', required: false, type: Number, description: 'Sayfa başına kayıt (varsayılan: 10, max: 100)' }),
    ApiQuery({ name: 'sort', required: false, type: String, description: 'Sıralama alanı (örn: createdAt:desc)' }),
  );
}

export function ApiFilterQueries(filters: string[]) {
  const decorators = filters.map(filter =>
    ApiQuery({ name: filter, required: false, type: String, description: `${filter} ile filtrele` }),
  );
  return applyDecorators(...decorators);
}

