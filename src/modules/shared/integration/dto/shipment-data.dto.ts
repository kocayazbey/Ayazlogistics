import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ShipmentDetailsDto } from './shipment-details.dto';

export class ShipmentDataDto extends ShipmentDetailsDto {
  @ApiProperty({ example: 'SHIP-2025-10-001' })
  @IsString()
  @IsNotEmpty()
  referenceNumber: string;

  @ApiProperty({ example: '2025-10-24', description: 'Ship date', required: false })
  @IsDateString()
  @IsOptional()
  shipDate?: string;

  @ApiProperty({ example: 'Leave at front door', required: false })
  @IsString()
  @IsOptional()
  deliveryInstructions?: string;

  @ApiProperty({ example: true, description: 'Signature required on delivery', required: false })
  @IsBoolean()
  @IsOptional()
  signatureRequired?: boolean;

  @ApiProperty({ example: true, description: 'Get insurance', required: false })
  @IsBoolean()
  @IsOptional()
  insurance?: boolean;

  @ApiProperty({ example: 5000, description: 'Declared value for insurance', required: false })
  @IsOptional()
  declaredValue?: number;
}

