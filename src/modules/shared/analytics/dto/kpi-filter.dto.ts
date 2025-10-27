import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KPICategory, KPIFrequency, KPIStatus } from './create-kpi.dto';

export class KPIFilterDto {
  @ApiPropertyOptional({ enum: KPICategory })
  @IsEnum(KPICategory)
  @IsOptional()
  category?: KPICategory;

  @ApiPropertyOptional({ enum: KPIFrequency })
  @IsEnum(KPIFrequency)
  @IsOptional()
  frequency?: KPIFrequency;

  @ApiPropertyOptional({ enum: KPIStatus })
  @IsEnum(KPIStatus)
  @IsOptional()
  status?: KPIStatus;

  @ApiPropertyOptional({ example: 'Delivery' })
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

