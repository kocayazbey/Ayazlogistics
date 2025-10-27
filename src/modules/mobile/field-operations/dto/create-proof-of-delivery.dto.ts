import { IsString, IsEnum, IsObject, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecipientInfoDto {
  @ApiProperty({ description: 'Recipient name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'ID number', example: '12345678901', required: false })
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiProperty({ description: 'Phone number', example: '+905551234567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Email address', example: 'john.doe@example.com', required: false })
  @IsOptional()
  @IsString()
  email?: string;
}

export class DeliveryDataDto {
  @ApiProperty({ description: 'Base64 encoded signature', example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...', required: false })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiProperty({ description: 'Base64 encoded photo', example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...', required: false })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ description: 'Delivery code', example: 'DEL123456', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'ID verified', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  idVerified?: boolean;
}

export class DeliveryLocationDto {
  @ApiProperty({ description: 'Latitude', example: 41.0082 })
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 28.9784 })
  longitude: number;

  @ApiProperty({ description: 'Accuracy in meters', example: 5.0 })
  accuracy: number;

  @ApiProperty({ description: 'Delivery address', example: '123 Main Street, Istanbul, Turkey' })
  @IsString()
  address: string;
}

export class CreateProofOfDeliveryDto {
  @ApiProperty({ description: 'Shipment ID', example: 'SHIP-123' })
  @IsString()
  shipmentId: string;

  @ApiProperty({ description: 'Driver ID', example: 'DRIVER-123' })
  @IsString()
  driverId: string;

  @ApiProperty({ description: 'Delivery type', example: 'signature', enum: ['signature', 'photo', 'code', 'id_verification'] })
  @IsEnum(['signature', 'photo', 'code', 'id_verification'])
  deliveryType: 'signature' | 'photo' | 'code' | 'id_verification';

  @ApiProperty({ description: 'Recipient information' })
  @IsObject()
  recipientInfo: RecipientInfoDto;

  @ApiProperty({ description: 'Delivery data' })
  @IsObject()
  deliveryData: DeliveryDataDto;

  @ApiProperty({ description: 'Delivery location' })
  @IsObject()
  location: DeliveryLocationDto;

  @ApiProperty({ description: 'Is offline operation', example: true })
  @IsBoolean()
  isOffline: boolean;

  @ApiProperty({ description: 'Synced at date', example: '2025-01-15T11:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  syncedAt?: string;
}
