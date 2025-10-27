import { IsString, IsOptional, IsEnum, IsNumber, IsUUID, Min, Max, IsBoolean, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export enum ApiKeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REVOKED = 'revoked',
}

export enum ApiKeyTier {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export class CreateApiKeyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  clientId: string;

  @IsEnum(ApiKeyTier)
  tier: ApiKeyTier;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  rateLimitPerMinute?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100000)
  rateLimitPerHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  rateLimitPerDay?: number;

  @IsOptional()
  @IsString()
  allowedIPs?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ApiKeyTier)
  tier?: ApiKeyTier;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  rateLimitPerMinute?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100000)
  rateLimitPerHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  rateLimitPerDay?: number;

  @IsOptional()
  @IsString()
  allowedIPs?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ApiKeyQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ApiKeyStatus)
  status?: ApiKeyStatus;

  @IsOptional()
  @IsEnum(ApiKeyTier)
  tier?: ApiKeyTier;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
