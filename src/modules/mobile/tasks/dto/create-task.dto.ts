import { IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';

export enum TaskType {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
  INVENTORY = 'inventory',
  MAINTENANCE = 'maintenance',
  INSPECTION = 'inspection',
  CLEANING = 'cleaning'
}

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TaskType)
  type: TaskType;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority = TaskPriority.MEDIUM;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  estimatedDuration?: number; // in minutes

  @IsOptional()
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };

  @IsOptional()
  metadata?: Record<string, any>;
}
