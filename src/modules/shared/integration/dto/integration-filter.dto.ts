import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IntegrationType, IntegrationStatus } from './create-integration.dto';

export class IntegrationFilterDto {
  @ApiPropertyOptional({ enum: IntegrationType })
  @IsEnum(IntegrationType)
  @IsOptional()
  type?: IntegrationType;

  @ApiPropertyOptional({ enum: IntegrationStatus })
  @IsEnum(IntegrationStatus)
  @IsOptional()
  status?: IntegrationStatus;

  @ApiPropertyOptional({ example: 'UPS' })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({ example: 'Shipping' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  limit?: number;
}

