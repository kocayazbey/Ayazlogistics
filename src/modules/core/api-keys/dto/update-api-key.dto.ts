import { IsString, IsArray, IsOptional, IsNumber, IsDateString, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRateLimitDto {
  @ApiPropertyOptional({ description: 'Requests per minute', example: 60 })
  @IsOptional()
  @IsNumber()
  requestsPerMinute?: number;

  @ApiPropertyOptional({ description: 'Requests per hour', example: 1000 })
  @IsOptional()
  @IsNumber()
  requestsPerHour?: number;

  @ApiPropertyOptional({ description: 'Requests per day', example: 10000 })
  @IsOptional()
  @IsNumber()
  requestsPerDay?: number;
}

export class UpdateAPIKeyDto {
  @ApiPropertyOptional({ description: 'API key name', example: 'Updated API Key' })
  @IsOptional()
  @IsString()
  keyName?: string;

  @ApiPropertyOptional({ description: 'API key permissions', example: ['read:orders', 'write:shipments'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ description: 'IP whitelist', example: ['192.168.1.1', '10.0.0.0/8'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipWhitelist?: string[];

  @ApiPropertyOptional({ description: 'Rate limit configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateRateLimitDto)
  rateLimit?: UpdateRateLimitDto;

  @ApiPropertyOptional({ description: 'Expiration date', example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Is active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
