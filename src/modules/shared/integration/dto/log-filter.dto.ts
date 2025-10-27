import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';

export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

export enum LogDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export class LogFilterDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  integrationId?: string;

  @ApiPropertyOptional({ enum: LogLevel })
  @IsEnum(LogLevel)
  @IsOptional()
  level?: LogLevel;

  @ApiPropertyOptional({ enum: LogDirection })
  @IsEnum(LogDirection)
  @IsOptional()
  direction?: LogDirection;

  @ApiPropertyOptional({ example: '2025-10-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-10-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 'rate' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  limit?: number;
}

