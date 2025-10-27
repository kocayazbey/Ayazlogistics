import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class AttendanceQueryDto {
  @ApiProperty({ example: '2025-10-01', description: 'Start date for attendance query' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2025-10-31', description: 'End date for attendance query' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ description: 'Specific employee ID', required: false })
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ example: 'DEPT-OPS', description: 'Department code', required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Manager ID to see team attendance', required: false })
  @IsUUID()
  @IsOptional()
  managerId?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  limit?: number;
}

