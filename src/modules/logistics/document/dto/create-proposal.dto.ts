import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProposalServiceDto {
  @ApiProperty({ example: 'Storage Service' })
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @ApiProperty({ example: 'Pallet storage in temperature-controlled warehouse' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 100, description: 'Estimated quantity' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 'pallet/month' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ example: 20.50, description: 'Unit price' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 2050, description: 'Total amount' })
  @IsNumber()
  @Min(0)
  totalAmount: number;
}

export class CreateProposalDto {
  @ApiProperty({ example: 'PROP-2025-10-001' })
  @IsString()
  @IsNotEmpty()
  proposalNumber: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'Comprehensive Logistics Services Proposal' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'This proposal outlines our services...' })
  @IsString()
  @IsNotEmpty()
  introduction: string;

  @ApiProperty({ type: [ProposalServiceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalServiceDto)
  @IsNotEmpty()
  services: ProposalServiceDto[];

  @ApiProperty({ example: 50000, description: 'Total proposal amount' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ example: '30 days', description: 'Validity period', required: false })
  @IsString()
  @IsOptional()
  validityPeriod?: string;

  @ApiProperty({ example: 'Net 30 days', description: 'Payment terms', required: false })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiProperty({ example: 'We look forward to working with you...', required: false })
  @IsString()
  @IsOptional()
  closingNotes?: string;
}

