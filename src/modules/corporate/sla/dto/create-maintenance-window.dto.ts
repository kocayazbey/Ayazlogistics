import { IsString, IsNumber, IsBoolean, IsEnum, IsArray, IsObject, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationsDto {
  @ApiProperty({ description: 'Advance notification in hours', example: 24 })
  @IsNumber()
  @Min(0)
  advance: number;

  @ApiProperty({ description: 'Notification channels', example: ['email', 'sms', 'slack'] })
  @IsArray()
  @IsString({ each: true })
  channels: string[];
}

export class CreateMaintenanceWindowDto {
  @ApiProperty({ description: 'Maintenance window name', example: 'Database Maintenance' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Maintenance window description', example: 'Scheduled database maintenance for performance optimization' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Start time', example: '2025-01-15T02:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'End time', example: '2025-01-15T04:00:00Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ description: 'Duration in minutes', example: 120 })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({ description: 'Maintenance type', example: 'scheduled', enum: ['scheduled', 'emergency', 'planned'] })
  @IsEnum(['scheduled', 'emergency', 'planned'])
  type: 'scheduled' | 'emergency' | 'planned';

  @ApiProperty({ description: 'Impact level', example: 'medium', enum: ['low', 'medium', 'high', 'critical'] })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  impact: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Affected services', example: ['api', 'database', 'storage'] })
  @IsArray()
  @IsString({ each: true })
  services: string[];

  @ApiProperty({ description: 'Notification settings' })
  @IsObject()
  notifications: NotificationsDto;

  @ApiProperty({ description: 'Initial status', example: 'scheduled', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] })
  @IsEnum(['scheduled', 'in_progress', 'completed', 'cancelled'])
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}
