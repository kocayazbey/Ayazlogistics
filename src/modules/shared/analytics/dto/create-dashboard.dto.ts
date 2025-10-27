import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum DashboardType {
  EXECUTIVE = 'executive',
  OPERATIONAL = 'operational',
  FINANCIAL = 'financial',
  LOGISTICS = 'logistics',
  WAREHOUSE = 'warehouse',
  SALES = 'sales',
  CUSTOM = 'custom',
}

export class DashboardWidgetDto {
  @ApiProperty({ example: 'total_revenue' })
  @IsString()
  @IsNotEmpty()
  widgetId: string;

  @ApiProperty({ example: 'Total Revenue' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'line_chart' })
  @IsString()
  @IsNotEmpty()
  widgetType: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  position: number;

  @ApiProperty({ example: '{"period": "monthly", "metric": "revenue"}', required: false })
  @IsOptional()
  config?: string;
}

export class CreateDashboardDto {
  @ApiProperty({ example: 'Executive Dashboard Q4 2025' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: DashboardType, example: DashboardType.EXECUTIVE })
  @IsEnum(DashboardType)
  @IsNotEmpty()
  type: DashboardType;

  @ApiProperty({ example: 'Comprehensive overview of business metrics', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [DashboardWidgetDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardWidgetDto)
  @IsOptional()
  widgets?: DashboardWidgetDto[];

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

