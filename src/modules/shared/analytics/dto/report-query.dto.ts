import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsArray } from 'class-validator';

export enum ReportType {
  FINANCIAL_SUMMARY = 'financial_summary',
  SALES_REPORT = 'sales_report',
  INVENTORY_REPORT = 'inventory_report',
  DELIVERY_PERFORMANCE = 'delivery_performance',
  CUSTOMER_ACTIVITY = 'customer_activity',
  EMPLOYEE_PERFORMANCE = 'employee_performance',
  WAREHOUSE_UTILIZATION = 'warehouse_utilization',
  VEHICLE_UTILIZATION = 'vehicle_utilization',
  COST_ANALYSIS = 'cost_analysis',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
}

export enum ReportPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  CUSTOM = 'custom',
}

export class ReportQueryDto {
  @ApiProperty({ enum: ReportType, example: ReportType.DELIVERY_PERFORMANCE })
  @IsEnum(ReportType)
  @IsNotEmpty()
  reportType: ReportType;

  @ApiProperty({ enum: ReportPeriod, example: ReportPeriod.MONTHLY })
  @IsEnum(ReportPeriod)
  @IsNotEmpty()
  period: ReportPeriod;

  @ApiProperty({ example: '2025-10-01', description: 'Report start date' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2025-10-31', description: 'Report end date' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ enum: ReportFormat, example: ReportFormat.PDF, required: false })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @ApiPropertyOptional({ type: [String], description: 'Specific metrics to include', required: false })
  @IsArray()
  @IsOptional()
  metrics?: string[];

  @ApiPropertyOptional({ example: 'DEPT-OPS', description: 'Filter by department', required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ example: 'WH-IST-001', description: 'Filter by warehouse', required: false })
  @IsString()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional({ example: 'Istanbul', description: 'Filter by region/city', required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({ example: true, description: 'Include comparison with previous period', required: false })
  @IsOptional()
  includePreviousPeriod?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Include charts and visualizations', required: false })
  @IsOptional()
  includeCharts?: boolean;

  @ApiPropertyOptional({ example: 'October 2025 Performance Report', description: 'Report title', required: false })
  @IsString()
  @IsOptional()
  title?: string;
}

