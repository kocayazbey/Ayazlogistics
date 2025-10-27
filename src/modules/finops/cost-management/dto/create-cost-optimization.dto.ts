import { IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCostOptimizationDto {
  @ApiProperty({ description: 'Optimization recommendation', example: 'Switch to reserved instances for 30% cost savings' })
  @IsString()
  recommendation: string;

  @ApiProperty({ description: 'Optimization category', example: 'infrastructure' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Potential savings amount', example: 5000.00 })
  @IsNumber()
  @Min(0)
  potentialSavings: number;

  @ApiProperty({ description: 'Implementation cost', example: 1000.00 })
  @IsNumber()
  @Min(0)
  implementationCost: number;

  @ApiProperty({ description: 'ROI percentage', example: 400.0 })
  @IsNumber()
  roi: number;

  @ApiProperty({ description: 'Priority level', example: 'high', enum: ['low', 'medium', 'high', 'critical'] })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Optimization status', example: 'pending', enum: ['pending', 'in_progress', 'completed', 'rejected'] })
  @IsEnum(['pending', 'in_progress', 'completed', 'rejected'])
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
}
