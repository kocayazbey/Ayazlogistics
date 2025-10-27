import { IsString, IsEnum, IsArray, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMFAConfigDto {
  @ApiProperty({ description: 'User ID', example: 'user123' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'MFA method', example: 'totp', enum: ['totp', 'sms', 'email', 'hardware_key'] })
  @IsEnum(['totp', 'sms', 'email', 'hardware_key'])
  method: 'totp' | 'sms' | 'email' | 'hardware_key';

  @ApiProperty({ description: 'MFA secret', example: 'JBSWY3DPEHPK3PXP', required: false })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiProperty({ description: 'Backup codes', example: ['123456', '789012'] })
  @IsArray()
  @IsString({ each: true })
  backupCodes: string[];

  @ApiProperty({ description: 'Is MFA enabled', example: true })
  @IsBoolean()
  isEnabled: boolean;
}
