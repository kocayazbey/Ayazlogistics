export class ErrorResponseDto {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error?: string;
  details?: any;
}

export class ValidationErrorDto extends ErrorResponseDto {
  validationErrors: Array<{
    field: string;
    constraints: Record<string, string>;
  }>;
}

export class BusinessErrorDto extends ErrorResponseDto {
  errorCode: string;
  businessMessage: string;
}

