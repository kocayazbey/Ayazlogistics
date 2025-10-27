import { IsString, IsArray, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVerticalDemoDto {
  @ApiProperty({ description: 'Industry', example: 'E-commerce' })
  @IsString()
  industry: string;

  @ApiProperty({ description: 'Demo title', example: 'E-commerce Logistics Optimization' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Demo description', example: 'Comprehensive logistics solution for e-commerce businesses' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Demo features', example: ['Real-time tracking', 'Inventory management', 'Route optimization'] })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({ description: 'Use cases', example: ['Same-day delivery', 'Multi-warehouse management', 'Returns processing'] })
  @IsArray()
  @IsString({ each: true })
  useCases: string[];

  @ApiProperty({ description: 'Video URL', example: 'https://youtube.com/watch?v=example', required: false })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiProperty({ description: 'Is demo active', example: true })
  @IsBoolean()
  isActive: boolean;
}
