import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';

export enum ReplenishmentSchedule {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  ON_DEMAND = 'on_demand',
}

export class CreateReplenishmentTaskDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Product ID', required: false })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({ example: 'A', description: 'Zone to replenish', required: false })
  @IsString()
  @IsOptional()
  zone?: string;

  @ApiProperty({ example: 10, description: 'Minimum threshold to trigger', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minThreshold?: number;
}

export class ScheduleReplenishmentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ enum: ReplenishmentSchedule, example: ReplenishmentSchedule.DAILY })
  @IsEnum(ReplenishmentSchedule)
  @IsNotEmpty()
  frequency: ReplenishmentSchedule;

  @ApiProperty({ example: '08:00', description: 'Schedule time (HH:mm)', required: false })
  @IsString()
  @IsOptional()
  time?: string;

  @ApiProperty({ example: 5, description: 'Minimum threshold', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minThreshold?: number;
}

export class ExecuteReplenishmentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Replenishment task ID' })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: 50, description: 'Actual quantity replenished', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  actualQuantity?: number;

  @ApiProperty({ example: 'Completed successfully', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
