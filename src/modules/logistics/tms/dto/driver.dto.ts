import { IsString, IsOptional, IsEmail, IsDateString, IsEnum, IsUUID, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDriverDto {
  @ApiProperty({ description: 'Driver number' })
  @IsString()
  driverNumber: string;

  @ApiProperty({ description: 'First name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Phone number' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Driver license number' })
  @IsString()
  licenseNumber: string;

  @ApiProperty({ description: 'License expiry date' })
  @IsDateString()
  licenseExpiry: string;

  @ApiProperty({ description: 'Driver status', enum: ['available', 'busy', 'off_duty', 'suspended'], required: false })
  @IsOptional()
  @IsEnum(['available', 'busy', 'off_duty', 'suspended'])
  status?: string;

  @ApiProperty({ description: 'Driver metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateDriverDto {
  @ApiProperty({ description: 'First name', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ description: 'Last name', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Driver license number', required: false })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ description: 'License expiry date', required: false })
  @IsOptional()
  @IsDateString()
  licenseExpiry?: string;

  @ApiProperty({ description: 'Driver status', enum: ['available', 'busy', 'off_duty', 'suspended'], required: false })
  @IsOptional()
  @IsEnum(['available', 'busy', 'off_duty', 'suspended'])
  status?: string;

  @ApiProperty({ description: 'Driver metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class DriverResponseDto {
  @ApiProperty({ description: 'Driver ID' })
  id: string;

  @ApiProperty({ description: 'Driver number' })
  driverNumber: string;

  @ApiProperty({ description: 'First name' })
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  lastName: string;

  @ApiProperty({ description: 'Phone number' })
  phone: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'Driver license number' })
  licenseNumber: string;

  @ApiProperty({ description: 'License expiry date' })
  licenseExpiry: string;

  @ApiProperty({ description: 'Driver status' })
  status: string;

  @ApiProperty({ description: 'Driver metadata' })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}
