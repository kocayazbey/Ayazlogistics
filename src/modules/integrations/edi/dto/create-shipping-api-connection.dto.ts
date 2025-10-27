import { IsString, IsEnum, IsArray, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShippingAPIConnectionDto {
  @ApiProperty({ description: 'Connection name', example: 'UPS API Connection' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Shipping provider', example: 'ups', enum: ['ups', 'fedex', 'dhl', 'turkish_cargo', 'aras', 'mng', 'yurtici'] })
  @IsEnum(['ups', 'fedex', 'dhl', 'turkish_cargo', 'aras', 'mng', 'yurtici'])
  provider: 'ups' | 'fedex' | 'dhl' | 'turkish_cargo' | 'aras' | 'mng' | 'yurtici';

  @ApiProperty({ description: 'API key', example: 'your-api-key-here' })
  @IsString()
  apiKey: string;

  @ApiProperty({ description: 'API secret', example: 'your-api-secret-here', required: false })
  @IsOptional()
  @IsString()
  apiSecret?: string;

  @ApiProperty({ description: 'Base URL', example: 'https://api.ups.com/v1' })
  @IsString()
  baseUrl: string;

  @ApiProperty({ description: 'Environment', example: 'sandbox', enum: ['sandbox', 'production'] })
  @IsEnum(['sandbox', 'production'])
  environment: 'sandbox' | 'production';

  @ApiProperty({ description: 'Supported features', example: ['tracking', 'shipping', 'rates'] })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({ description: 'Is connection active', example: true })
  @IsBoolean()
  isActive: boolean;
}
