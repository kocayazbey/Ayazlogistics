import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, IsDateString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceivedPOLineDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'PO line item ID' })
  @IsUUID()
  @IsNotEmpty()
  lineId: string;

  @ApiProperty({ example: 480, description: 'Quantity received' })
  @IsNumber()
  @Min(0)
  receivedQuantity: number;

  @ApiProperty({ example: 20, description: 'Quantity rejected/damaged', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  rejectedQuantity?: number;

  @ApiProperty({ example: 'Minor packaging damage on 20 units', description: 'Rejection reason', required: false })
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @ApiProperty({ example: 'LOT-2025-10-24-001', required: false })
  @IsString()
  @IsOptional()
  lotNumber?: string;

  @ApiProperty({ example: '2026-10-24', description: 'Expiry date', required: false })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty({ example: 'SN-001,SN-002', description: 'Serial numbers (comma-separated)', required: false })
  @IsString()
  @IsOptional()
  serialNumbers?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Storage location ID', required: false })
  @IsUUID()
  @IsOptional()
  locationId?: string;

  @ApiProperty({ example: 'Quality check passed', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReceivePODto {
  @ApiProperty({ type: [ReceivedPOLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivedPOLineDto)
  @IsNotEmpty()
  lines: ReceivedPOLineDto[];

  @ApiProperty({ example: 'GRN-2025-10-001', description: 'Goods receipt note number' })
  @IsString()
  @IsNotEmpty()
  grnNumber: string;

  @ApiProperty({ example: '2025-10-24T09:30:00Z', description: 'Actual receiving date/time' })
  @IsDateString()
  @IsNotEmpty()
  receivedDate: string;

  @ApiProperty({ example: 'John Doe', description: 'Person who received goods' })
  @IsString()
  @IsNotEmpty()
  receivedBy: string;

  @ApiProperty({ example: 'TRUCK-ABC123', description: 'Carrier vehicle reference', required: false })
  @IsString()
  @IsOptional()
  carrierVehicle?: string;

  @ApiProperty({ example: 'Ali Yilmaz', description: 'Driver name', required: false })
  @IsString()
  @IsOptional()
  driverName?: string;

  @ApiProperty({ example: 'DOCK-5', description: 'Receiving dock location', required: false })
  @IsString()
  @IsOptional()
  dockLocation?: string;

  @ApiProperty({ example: 'All items inspected and approved', required: false })
  @IsString()
  @IsOptional()
  inspectionNotes?: string;

  @ApiProperty({ example: 'signature_base64_data', description: 'Receiver signature', required: false })
  @IsString()
  @IsOptional()
  receiverSignature?: string;

  @ApiProperty({ example: 'signature_base64_data', description: 'Driver signature', required: false })
  @IsString()
  @IsOptional()
  driverSignature?: string;

  @ApiProperty({ example: 'Delivery in good condition, no issues', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

