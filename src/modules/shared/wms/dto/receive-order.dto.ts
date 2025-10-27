import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, IsDateString, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceivedLineDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Line item ID from receiving order' })
  @IsUUID()
  @IsNotEmpty()
  lineId: string;

  @ApiProperty({ example: 95, description: 'Actual received quantity' })
  @IsNumber()
  @Min(0)
  receivedQuantity: number;

  @ApiProperty({ example: 5, description: 'Damaged quantity', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  damagedQuantity?: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Putaway location ID', required: false })
  @IsUUID()
  @IsOptional()
  locationId?: string;

  @ApiProperty({ example: 'LOT-2025-001', description: 'Actual lot number', required: false })
  @IsString()
  @IsOptional()
  lotNumber?: string;

  @ApiProperty({ example: 'SN-001,SN-002', description: 'Serial numbers (comma-separated)', required: false })
  @IsString()
  @IsOptional()
  serialNumbers?: string;

  @ApiProperty({ example: 'Minor packaging damage on 5 units', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReceiveOrderDto {
  @ApiProperty({ type: [ReceivedLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivedLineDto)
  @IsNotEmpty()
  lines: ReceivedLineDto[];

  @ApiProperty({ example: '2025-10-24T10:30:00Z', description: 'Actual receiving date/time', required: false })
  @IsDateString()
  @IsOptional()
  receivedAt?: string;

  @ApiProperty({ example: 'John Doe', description: 'Receiver name' })
  @IsString()
  @IsNotEmpty()
  receivedBy: string;

  @ApiProperty({ example: 'DOCK-3', description: 'Receiving dock location', required: false })
  @IsString()
  @IsOptional()
  dockLocation?: string;

  @ApiProperty({ example: 'All items received in good condition except noted damages', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'signature_base64_data', description: 'Digital signature of receiver', required: false })
  @IsString()
  @IsOptional()
  signature?: string;
}

