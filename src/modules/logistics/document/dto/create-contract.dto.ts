import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsDate, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContractDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: 'service_agreement' })
  @IsString()
  @IsNotEmpty()
  contractType: string;

  @ApiProperty({ example: '2025-01-01T00:00:00Z' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ type: 'object' })
  @IsObject()
  @IsOptional()
  terms?: any;

  @ApiPropertyOptional({ type: 'object' })
  @IsObject()
  @IsOptional()
  clauses?: any;
}

