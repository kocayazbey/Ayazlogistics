import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsDateString, IsString, Min } from 'class-validator';

export class UpdateKPIDto {
  @ApiProperty({ example: 92.5, description: 'Actual KPI value' })
  @IsNumber()
  @Min(0)
  actualValue: number;

  @ApiProperty({ example: '2025-10-01', description: 'Period start date' })
  @IsDateString()
  @IsNotEmpty()
  periodStart: string;

  @ApiProperty({ example: '2025-10-31', description: 'Period end date' })
  @IsDateString()
  @IsNotEmpty()
  periodEnd: string;

  @ApiProperty({ example: 'Performance improved by 2.5% compared to last month', required: false })
  @IsString()
  @IsOptional()
  comments?: string;

  @ApiProperty({ example: 'John Doe', description: 'Person who updated the KPI', required: false })
  @IsString()
  @IsOptional()
  updatedBy?: string;
}

