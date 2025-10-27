import { IsString, IsNumber, IsObject, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PenaltiesDto {
  @ApiProperty({ description: 'Availability penalty percentage', example: 5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  availability: number;

  @ApiProperty({ description: 'Response time penalty percentage', example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  responseTime: number;

  @ApiProperty({ description: 'Throughput penalty percentage', example: 8 })
  @IsNumber()
  @Min(0)
  @Max(100)
  throughput: number;

  @ApiProperty({ description: 'Error rate penalty percentage', example: 15 })
  @IsNumber()
  @Min(0)
  @Max(100)
  errorRate: number;
}

export class CreateSLADto {
  @ApiProperty({ description: 'SLA name', example: 'API Availability SLA' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'SLA description', example: 'Service level agreement for API availability' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Service type', example: 'api', enum: ['api', 'database', 'storage', 'compute', 'network'] })
  @IsEnum(['api', 'database', 'storage', 'compute', 'network'])
  serviceType: 'api' | 'database' | 'storage' | 'compute' | 'network';

  @ApiProperty({ description: 'Availability target percentage', example: 99.9 })
  @IsNumber()
  @Min(0)
  @Max(100)
  availabilityTarget: number;

  @ApiProperty({ description: 'Response time target in milliseconds', example: 200 })
  @IsNumber()
  @Min(0)
  responseTimeTarget: number;

  @ApiProperty({ description: 'Throughput target in requests per second', example: 1000 })
  @IsNumber()
  @Min(0)
  throughputTarget: number;

  @ApiProperty({ description: 'Error rate target percentage', example: 0.1 })
  @IsNumber()
  @Min(0)
  @Max(100)
  errorRateTarget: number;

  @ApiProperty({ description: 'Measurement period in days', example: 30 })
  @IsNumber()
  @Min(1)
  measurementPeriod: number;

  @ApiProperty({ description: 'Penalty structure' })
  @IsObject()
  penalties: PenaltiesDto;

  @ApiProperty({ description: 'Is SLA active', example: true })
  @IsBoolean()
  isActive: boolean;
}
