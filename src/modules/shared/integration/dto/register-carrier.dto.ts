import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUrl, IsArray, ValidateNested, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CarrierServiceDto {
  @ApiProperty({ example: 'ground' })
  @IsString()
  @IsNotEmpty()
  serviceCode: string;

  @ApiProperty({ example: 'UPS Ground' })
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @ApiProperty({ example: '3-5 business days' })
  @IsString()
  @IsNotEmpty()
  deliveryTime: string;

  @ApiProperty({ example: 25.99, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  baseRate?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class RegisterCarrierDto {
  @ApiProperty({ example: 'UPS Turkey' })
  @IsString()
  @IsNotEmpty()
  carrierName: string;

  @ApiProperty({ example: 'UPS' })
  @IsString()
  @IsNotEmpty()
  carrierCode: string;

  @ApiProperty({ example: 'https://api.ups.com/shipping/v1', description: 'Shipping API endpoint' })
  @IsUrl()
  @IsNotEmpty()
  apiEndpoint: string;

  @ApiProperty({ example: 'your_api_key_here' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiProperty({ example: 'account_number_here', required: false })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiProperty({ type: [CarrierServiceDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CarrierServiceDto)
  @IsOptional()
  services?: CarrierServiceDto[];

  @ApiProperty({ example: true, description: 'Supports international shipping', required: false })
  @IsBoolean()
  @IsOptional()
  supportsInternational?: boolean;

  @ApiProperty({ example: true, description: 'Supports real-time tracking', required: false })
  @IsBoolean()
  @IsOptional()
  supportsTracking?: boolean;

  @ApiProperty({ example: true, description: 'Supports label printing', required: false })
  @IsBoolean()
  @IsOptional()
  supportsLabelPrinting?: boolean;

  @ApiProperty({ example: true, description: 'Supports rate calculation', required: false })
  @IsBoolean()
  @IsOptional()
  supportsRateCalculation?: boolean;

  @ApiProperty({ example: 'https://yourdomain.com/webhooks/ups', description: 'Webhook URL for tracking updates', required: false })
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;

  @ApiProperty({ example: 'Preferred carrier for domestic shipments', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

