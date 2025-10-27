import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID, IsEnum, IsNumber, Min, Max } from 'class-validator';

export enum CheckInType {
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
  BREAK_START = 'break_start',
  BREAK_END = 'break_end',
}

export enum CheckInMethod {
  BIOMETRIC = 'biometric',
  RFID_CARD = 'rfid_card',
  MOBILE_APP = 'mobile_app',
  WEB_PORTAL = 'web_portal',
  MANUAL = 'manual',
}

export class CheckInDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Employee ID' })
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ enum: CheckInType, example: CheckInType.CHECK_IN })
  @IsEnum(CheckInType)
  @IsNotEmpty()
  checkInType: CheckInType;

  @ApiProperty({ example: '2025-10-24T08:00:00Z', description: 'Check-in timestamp' })
  @IsDateString()
  @IsNotEmpty()
  timestamp: string;

  @ApiProperty({ enum: CheckInMethod, example: CheckInMethod.RFID_CARD, required: false })
  @IsEnum(CheckInMethod)
  @IsOptional()
  method?: CheckInMethod;

  @ApiProperty({ example: '41.0082,28.9784', description: 'GPS coordinates (for mobile check-in)', required: false })
  @IsString()
  @IsOptional()
  gpsCoordinates?: string;

  @ApiProperty({ example: 'Istanbul Warehouse', description: 'Location/site name', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 'DEVICE-001', description: 'Check-in device/terminal ID', required: false })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiProperty({ example: '192.168.1.100', description: 'IP address', required: false })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({ example: 36.5, description: 'Body temperature (for health check)', required: false })
  @IsNumber()
  @IsOptional()
  @Min(35)
  @Max(42)
  temperature?: number;

  @ApiProperty({ example: 'Late due to traffic', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'photo_base64_data', description: 'Photo capture (for biometric/security)', required: false })
  @IsString()
  @IsOptional()
  photoCapture?: string;
}

