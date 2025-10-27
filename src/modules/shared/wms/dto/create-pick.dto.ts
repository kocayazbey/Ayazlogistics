import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class PickItemDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'SKU-001' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 'A-1-15' })
  @IsString()
  location: string;
}

export class CreatePickDto {
  @ApiProperty({ example: 'PK-2024-001' })
  @IsString()
  pickNumber: string;

  @ApiProperty({ example: 'ORD-2024-001' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 'ABC Teknoloji' })
  @IsString()
  customer: string;

  @ApiProperty({ example: 'high', enum: ['high', 'normal', 'low'] })
  @IsEnum(['high', 'normal', 'low'])
  priority: string;

  @ApiProperty({ example: 'user-123' })
  @IsString()
  assignedTo: string;

  @ApiProperty({ example: 'A-1' })
  @IsString()
  zoneId: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  expectedDate: string;

  @ApiProperty({ example: 'Urgent delivery required' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PickItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PickItemDto)
  items: PickItemDto[];
}
