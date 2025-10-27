import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsDateString, IsBoolean } from 'class-validator';

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  TASK = 'task',
  NOTE = 'note',
  DEMO = 'demo',
  PROPOSAL = 'proposal',
  FOLLOW_UP = 'follow_up',
  OTHER = 'other',
}

export enum ActivityStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

export enum ActivityPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateActivityDto {
  @ApiProperty({ example: 'Follow-up Call' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ enum: ActivityType, example: ActivityType.CALL })
  @IsEnum(ActivityType)
  @IsNotEmpty()
  type: ActivityType;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Customer ID', required: false })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Lead ID', required: false })
  @IsUUID()
  @IsOptional()
  leadId?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dealer ID', required: false })
  @IsUUID()
  @IsOptional()
  dealerId?: string;

  @ApiProperty({ example: 'Discussed pricing and contract terms. Customer interested in annual contract.', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2025-10-24T14:00:00Z', description: 'Scheduled start time', required: false })
  @IsDateString()
  @IsOptional()
  scheduledStart?: string;

  @ApiProperty({ example: '2025-10-24T15:00:00Z', description: 'Scheduled end time', required: false })
  @IsDateString()
  @IsOptional()
  scheduledEnd?: string;

  @ApiProperty({ example: '2025-10-24T14:05:00Z', description: 'Actual start time', required: false })
  @IsDateString()
  @IsOptional()
  actualStart?: string;

  @ApiProperty({ example: '2025-10-24T14:45:00Z', description: 'Actual end time', required: false })
  @IsDateString()
  @IsOptional()
  actualEnd?: string;

  @ApiProperty({ enum: ActivityStatus, example: ActivityStatus.SCHEDULED, required: false })
  @IsEnum(ActivityStatus)
  @IsOptional()
  status?: ActivityStatus;

  @ApiProperty({ enum: ActivityPriority, example: ActivityPriority.HIGH, required: false })
  @IsEnum(ActivityPriority)
  @IsOptional()
  priority?: ActivityPriority;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440003', description: 'Assigned to user ID', required: false })
  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @ApiProperty({ example: 'Istanbul Office, Meeting Room 2', description: 'Location of activity', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: true, description: 'Send reminder notification', required: false })
  @IsBoolean()
  @IsOptional()
  reminderEnabled?: boolean;

  @ApiProperty({ example: '2025-10-24T13:00:00Z', description: 'Reminder time', required: false })
  @IsDateString()
  @IsOptional()
  reminderTime?: string;

  @ApiProperty({ example: 'Prepare contract draft before call', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'Follow up in 3 days with contract proposal', description: 'Outcome of activity', required: false })
  @IsString()
  @IsOptional()
  outcome?: string;
}

