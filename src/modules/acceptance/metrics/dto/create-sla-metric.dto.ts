import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSLAMetricDto {
  @ApiProperty({ description: 'Service name', example: 'API Gateway' })
  @IsString()
  service: string;

  @ApiProperty({ description: 'SLA target percentage', example: 99.9 })
  @IsNumber()
  @Min(0)
  @Min(100)
  slaTarget: number;

  @ApiProperty({ description: 'SLA actual percentage', example: 99.95 })
  @IsNumber()
  @Min(0)
  @Min(100)
  slaActual: number;

  @ApiProperty({ description: 'Period (YYYY-MM)', example: '2025-01' })
  @IsString()
  period: string;

  @ApiProperty({ description: 'Number of incidents', example: 2 })
  @IsNumber()
  @Min(0)
  incidents: number;

  @ApiProperty({ description: 'Total requests', example: 1000000 })
  @IsNumber()
  @Min(0)
  totalRequests: number;
}
