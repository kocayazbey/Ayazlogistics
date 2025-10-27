import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsUUID, IsNumber, Min } from 'class-validator';

export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  UNPAID = 'unpaid',
  BEREAVEMENT = 'bereavement',
  MARRIAGE = 'marriage',
  EMERGENCY = 'emergency',
  STUDY = 'study',
  OTHER = 'other',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export class CreateLeaveRequestDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Employee ID' })
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ enum: LeaveType, example: LeaveType.ANNUAL })
  @IsEnum(LeaveType)
  @IsNotEmpty()
  leaveType: LeaveType;

  @ApiProperty({ example: '2025-10-27', description: 'Leave start date' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2025-10-31', description: 'Leave end date' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ example: 5, description: 'Number of days requested' })
  @IsNumber()
  @Min(0.5)
  numberOfDays: number;

  @ApiProperty({ example: 'Family vacation', description: 'Reason for leave' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ enum: LeaveStatus, example: LeaveStatus.PENDING, required: false })
  @IsEnum(LeaveStatus)
  @IsOptional()
  status?: LeaveStatus;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Substitute employee ID', required: false })
  @IsUUID()
  @IsOptional()
  substituteEmployeeId?: string;

  @ApiProperty({ example: 'medical_certificate.pdf', description: 'Attachment filename (for sick leave)', required: false })
  @IsString()
  @IsOptional()
  attachmentPath?: string;

  @ApiProperty({ example: '+905559876543', description: 'Contact phone during leave', required: false })
  @IsString()
  @IsOptional()
  contactDuringLeave?: string;

  @ApiProperty({ example: 'Will check emails once daily', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

