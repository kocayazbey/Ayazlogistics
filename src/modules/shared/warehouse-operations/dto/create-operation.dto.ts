import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';

export enum OperationType {
  RECEIVING = 'receiving',
  PUTAWAY = 'putaway',
  PICKING = 'picking',
  PACKING = 'packing',
  SHIPPING = 'shipping',
  CYCLE_COUNT = 'cycle_count',
  REPLENISHMENT = 'replenishment',
  TRANSFER = 'transfer',
}

export enum OperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateOperationDto {
  @ApiProperty({ description: 'Operation type', enum: OperationType, example: OperationType.RECEIVING })
  @IsEnum(OperationType)
  operationType: OperationType;

  @ApiProperty({ description: 'Warehouse ID', example: 'WH-001' })
  @IsString()
  warehouseId: string;

  @ApiProperty({ description: 'Order ID', example: 'ORD-001' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ description: 'Operation status', enum: OperationStatus, example: OperationStatus.PENDING })
  @IsEnum(OperationStatus)
  @IsOptional()
  status?: OperationStatus;

  @ApiProperty({ description: 'Assigned to user ID', example: 'USER-001' })
  @IsString()
  @IsOptional()
  assignedTo?: string;

  @ApiProperty({ description: 'Priority level', enum: Priority, example: Priority.MEDIUM })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiProperty({ description: 'Scheduled start time', example: '2024-01-01T09:00:00Z' })
  @IsDateString()
  @IsOptional()
  scheduledStart?: string;

  @ApiProperty({ description: 'Scheduled end time', example: '2024-01-01T17:00:00Z' })
  @IsDateString()
  @IsOptional()
  scheduledEnd?: string;

  @ApiProperty({ description: 'Notes', example: 'Handle with care' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Expected duration in minutes', example: 120 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  expectedDuration?: number;
}
