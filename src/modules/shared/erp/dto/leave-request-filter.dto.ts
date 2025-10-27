import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';
import { LeaveType, LeaveStatus } from './create-leave-request.dto';

export class LeaveRequestFilterDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ enum: LeaveType })
  @IsEnum(LeaveType)
  @IsOptional()
  leaveType?: LeaveType;

  @ApiPropertyOptional({ enum: LeaveStatus })
  @IsEnum(LeaveStatus)
  @IsOptional()
  status?: LeaveStatus;

  @ApiPropertyOptional({ example: '2025-10-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-10-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 'DEPT-OPS' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  limit?: number;
}

