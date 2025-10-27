import { IsString, IsOptional, IsEnum, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOperationDto {
  @ApiProperty({ description: 'Warehouse ID' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ description: 'Operation type', enum: ['receiving', 'picking', 'shipping', 'inventory'] })
  @IsEnum(['receiving', 'picking', 'shipping', 'inventory'])
  type: string;

  @ApiProperty({ description: 'Operation name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Operation description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Operation priority', enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @ApiPropertyOptional({ description: 'Operation metadata' })
  @IsOptional()
  metadata?: any;
}
