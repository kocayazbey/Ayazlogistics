import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiSuccessResponse<T = any> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiPropertyOptional()
  message?: string;

  @ApiProperty({ example: '2025-10-24T10:00:00Z' })
  timestamp: string;

  @ApiPropertyOptional()
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };

  constructor(data: T, message?: string, meta?: any) {
    this.success = true;
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.meta = meta;
  }
}

export class ApiErrorResponse {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 'Resource not found' })
  message: string;

  @ApiProperty({ example: 'NOT_FOUND' })
  errorCode: string;

  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: '2025-10-24T10:00:00Z' })
  timestamp: string;

  @ApiPropertyOptional()
  path?: string;

  @ApiPropertyOptional()
  method?: string;

  @ApiPropertyOptional()
  details?: any;

  @ApiPropertyOptional()
  stack?: string;

  @ApiPropertyOptional()
  correlationId?: string;

  constructor(
    message: string,
    errorCode: string,
    statusCode: number,
    details?: any,
    path?: string,
    method?: string,
    correlationId?: string,
  ) {
    this.success = false;
    this.message = message;
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.details = details;
    this.path = path;
    this.method = method;
    this.correlationId = correlationId;

    if (process.env.NODE_ENV === 'development' && details?.stack) {
      this.stack = details.stack;
    }
  }
}

export enum ErrorCode {
  // Authentication & Authorization
  INVALID_CREDENTIALS = 'AUTH_001',
  TOKEN_EXPIRED = 'AUTH_002',
  TOKEN_INVALID = 'AUTH_003',
  INSUFFICIENT_PERMISSIONS = 'AUTH_004',
  ACCOUNT_LOCKED = 'AUTH_005',
  ACCOUNT_DISABLED = 'AUTH_006',
  MFA_REQUIRED = 'AUTH_007',
  MFA_INVALID = 'AUTH_008',

  // Validation
  VALIDATION_ERROR = 'VAL_001',
  MISSING_REQUIRED_FIELD = 'VAL_002',
  INVALID_FORMAT = 'VAL_003',
  INVALID_DATE_RANGE = 'VAL_004',
  INVALID_ENUM_VALUE = 'VAL_005',

  // Business Logic
  INSUFFICIENT_STOCK = 'BIZ_001',
  DUPLICATE_ENTRY = 'BIZ_002',
  INVALID_STATE_TRANSITION = 'BIZ_003',
  OPERATION_NOT_ALLOWED = 'BIZ_004',
  RESOURCE_LOCKED = 'BIZ_005',

  // Database
  DATABASE_ERROR = 'DB_001',
  RECORD_NOT_FOUND = 'DB_002',
  CONSTRAINT_VIOLATION = 'DB_003',
  DEADLOCK = 'DB_004',

  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXT_001',
  PAYMENT_GATEWAY_ERROR = 'EXT_002',
  EMAIL_SERVICE_ERROR = 'EXT_003',
  SMS_SERVICE_ERROR = 'EXT_004',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_001',

  // File Operations
  FILE_TOO_LARGE = 'FILE_001',
  INVALID_FILE_TYPE = 'FILE_002',
  UPLOAD_FAILED = 'FILE_003',

  // Generic
  INTERNAL_SERVER_ERROR = 'SYS_001',
  SERVICE_UNAVAILABLE = 'SYS_002',
  TIMEOUT = 'SYS_003',
}

