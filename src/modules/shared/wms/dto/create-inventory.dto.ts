import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

export class CreateInventoryDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Electronics' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'SKU-001' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 'A-1-15' })
  @IsString()
  location: string;

  @ApiProperty({ example: 'A-1' })
  @IsString()
  zoneId: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive', 'reserved'] })
  @IsEnum(['active', 'inactive', 'reserved'])
  status: string;

  @ApiProperty({ example: 15000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiProperty({ example: 'Apple Inc.', required: false })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiProperty({ example: '2024-01-15', required: false })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiProperty({ example: 'High-end smartphone', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
