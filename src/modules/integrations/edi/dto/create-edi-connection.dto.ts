import { IsString, IsEnum, IsObject, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EDIConfigurationDto {
  @ApiProperty({ description: 'Host address', example: 'ftp.example.com', required: false })
  @IsOptional()
  @IsString()
  host?: string;

  @ApiProperty({ description: 'Port number', example: 21, required: false })
  @IsOptional()
  @IsNumber()
  port?: number;

  @ApiProperty({ description: 'Username', example: 'edi_user', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'Password', example: 'password123', required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ description: 'Encryption type', example: 'SSL', required: false })
  @IsOptional()
  @IsString()
  encryption?: string;

  @ApiProperty({ description: 'Compression type', example: 'ZIP', required: false })
  @IsOptional()
  @IsString()
  compression?: string;

  @ApiProperty({ description: 'Require acknowledgment', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  acknowledgment?: boolean;

  @ApiProperty({ description: 'Retry attempts', example: 3, required: false })
  @IsOptional()
  @IsNumber()
  retryAttempts?: number;

  @ApiProperty({ description: 'Timeout in seconds', example: 300, required: false })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiProperty({ description: 'Schedule pattern', example: '0 0 * * *', required: false })
  @IsOptional()
  @IsString()
  schedule?: string;
}

export class CreateEDIConnectionDto {
  @ApiProperty({ description: 'Connection name', example: 'Partner A EDI Connection' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Connection description', example: 'EDI connection for Partner A' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Partner ID', example: 'PARTNER-001' })
  @IsString()
  partnerId: string;

  @ApiProperty({ description: 'EDI standard', example: 'X12', enum: ['X12', 'EDIFACT', 'TRADACOMS', 'ODETTE'] })
  @IsEnum(['X12', 'EDIFACT', 'TRADACOMS', 'ODETTE'])
  standard: 'X12' | 'EDIFACT' | 'TRADACOMS' | 'ODETTE';

  @ApiProperty({ description: 'Standard version', example: '4010' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Connection type', example: 'ftp', enum: ['ftp', 'sftp', 'as2', 'api', 'email'] })
  @IsEnum(['ftp', 'sftp', 'as2', 'api', 'email'])
  connectionType: 'ftp' | 'sftp' | 'as2' | 'api' | 'email';

  @ApiProperty({ description: 'Connection configuration' })
  @IsObject()
  configuration: EDIConfigurationDto;

  @ApiProperty({ description: 'Is connection active', example: true })
  @IsBoolean()
  isActive: boolean;
}
