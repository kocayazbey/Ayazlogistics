import { IsString, IsEnum, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLogEntryDto {
  @ApiProperty({ description: 'Log level', example: 'info', enum: ['debug', 'info', 'warn', 'error', 'fatal'] })
  @IsEnum(['debug', 'info', 'warn', 'error', 'fatal'])
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  @ApiProperty({ description: 'Log message', example: 'User authentication successful' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Log context', example: { userId: 'user123', action: 'login' } })
  @IsObject()
  context: Record<string, any>;

  @ApiProperty({ description: 'Service name', example: 'auth-service' })
  @IsString()
  service: string;

  @ApiProperty({ description: 'User ID', example: 'user123', required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Request ID', example: 'req-123456', required: false })
  @IsOptional()
  @IsString()
  requestId?: string;
}
