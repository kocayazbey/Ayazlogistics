import { IsString, IsArray, IsOptional, IsNumber, IsDateString, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RateLimitDto {
  @ApiProperty({ description: 'Requests per minute', example: 60 })
  @IsNumber()
  requestsPerMinute: number;

  @ApiProperty({ description: 'Requests per hour', example: 1000 })
  @IsNumber()
  requestsPerHour: number;

  @ApiProperty({ description: 'Requests per day', example: 10000 })
  @IsNumber()
  requestsPerDay: number;
}

export class CreateAPIKeyDto {
  @ApiProperty({ description: 'Customer ID', example: 'customer-123' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'API key name', example: 'Production API Key' })
  @IsString()
  keyName: string;

  @ApiProperty({ description: 'API key permissions', example: ['read:orders', 'write:shipments'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiPropertyOptional({ description: 'IP whitelist', example: ['192.168.1.1', '10.0.0.0/8'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipWhitelist?: string[];

  @ApiPropertyOptional({ description: 'Rate limit configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RateLimitDto)
  rateLimit?: RateLimitDto;

  @ApiPropertyOptional({ description: 'Expiration date', example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Is active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
