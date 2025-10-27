import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty({ description: 'Indicates if the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data' })
  data?: T;

  @ApiProperty({ description: 'Error details if any' })
  error?: {
    code: string;
    details?: any;
  };

  @ApiProperty({ description: 'Request timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Request ID for tracking' })
  requestId?: string;

  @ApiProperty({ description: 'Pagination info for list responses' })
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };

  constructor(partial: Partial<ApiResponseDto<T>>) {
    Object.assign(this, partial);
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message = 'Success'): ApiResponseDto<T> {
    return new ApiResponseDto({
      success: true,
      message,
      data,
    });
  }

  static error(message: string, code?: string, details?: any): ApiResponseDto {
    return new ApiResponseDto({
      success: false,
      message,
      error: {
        code: code || 'UNKNOWN_ERROR',
        details,
      },
    });
  }

  static paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    },
    message = 'Success'
  ): ApiResponseDto<T[]> {
    return new ApiResponseDto({
      success: true,
      message,
      data,
      pagination,
    });
  }
}

export class ValidationErrorDto {
  @ApiProperty({ description: 'Field that failed validation' })
  field: string;

  @ApiProperty({ description: 'Validation error message' })
  message: string;

  @ApiProperty({ description: 'Value that failed validation' })
  value?: any;

  @ApiProperty({ description: 'Validation constraint' })
  constraint?: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ description: 'Indicates the request failed' })
  success: false;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Error code' })
  code: string;

  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Validation errors if any' })
  errors?: ValidationErrorDto[];

  @ApiProperty({ description: 'Request timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Request ID for tracking' })
  requestId?: string;

  @ApiProperty({ description: 'Error details' })
  details?: any;
}
