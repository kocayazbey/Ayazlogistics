import { IsString, IsArray, IsObject, IsBoolean, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class APIEndpointDto {
  @ApiProperty({ description: 'Endpoint path', example: '/v1/shipments' })
  @IsString()
  path: string;

  @ApiProperty({ description: 'HTTP method', example: 'GET', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] })
  @IsEnum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  @ApiProperty({ description: 'Endpoint description', example: 'Get all shipments' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Endpoint parameters' })
  @IsArray()
  @IsObject({ each: true })
  parameters: any[];

  @ApiProperty({ description: 'Endpoint responses' })
  @IsArray()
  @IsObject({ each: true })
  responses: any[];

  @ApiProperty({ description: 'Is endpoint deprecated', example: false })
  @IsBoolean()
  isDeprecated: boolean;
}

export class APIAuthenticationDto {
  @ApiProperty({ description: 'Authentication type', example: 'api_key', enum: ['api_key', 'oauth2', 'bearer', 'basic'] })
  @IsEnum(['api_key', 'oauth2', 'bearer', 'basic'])
  type: 'api_key' | 'oauth2' | 'bearer' | 'basic';

  @ApiProperty({ description: 'Is authentication required', example: true })
  @IsBoolean()
  required: boolean;

  @ApiProperty({ description: 'Authentication description', example: 'API key authentication required' })
  @IsString()
  description: string;
}

export class RateLimitDto {
  @ApiProperty({ description: 'Time window in seconds', example: 3600 })
  @IsNumber()
  window: number;

  @ApiProperty({ description: 'Request limit', example: 1000 })
  @IsNumber()
  limit: number;

  @ApiProperty({ description: 'Burst limit', example: 100, required: false })
  @IsNumber()
  burst?: number;
}

export class CreatePublicAPIDto {
  @ApiProperty({ description: 'API name', example: 'Logistics API' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'API version', example: 'v1' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'API description', example: 'Comprehensive logistics management API' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Base URL', example: 'https://api.ayazlogistics.com' })
  @IsString()
  baseUrl: string;

  @ApiProperty({ description: 'API endpoints' })
  @IsArray()
  @IsObject({ each: true })
  endpoints: APIEndpointDto[];

  @ApiProperty({ description: 'Authentication configuration' })
  @IsObject()
  authentication: APIAuthenticationDto;

  @ApiProperty({ description: 'Rate limits' })
  @IsArray()
  @IsObject({ each: true })
  rateLimits: RateLimitDto[];

  @ApiProperty({ description: 'Is API active', example: true })
  @IsBoolean()
  isActive: boolean;
}
