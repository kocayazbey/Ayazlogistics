import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID, IsDateString, IsArray } from 'class-validator';

export enum LegalContractType {
  SERVICE_AGREEMENT = 'service_agreement',
  NON_DISCLOSURE = 'non_disclosure',
  PARTNERSHIP = 'partnership',
  EMPLOYMENT = 'employment',
  LEASE = 'lease',
  VENDOR = 'vendor',
  OTHER = 'other',
}

export enum LegalContractStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  UNDER_NEGOTIATION = 'under_negotiation',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SIGNED = 'signed',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  REJECTED = 'rejected',
}

export enum ApprovalLevel {
  LEGAL_TEAM = 'legal_team',
  FINANCE = 'finance',
  MANAGEMENT = 'management',
  EXECUTIVE = 'executive',
  BOARD = 'board',
}

export class CreateLegalContractDto {
  @ApiProperty({ example: 'Service Agreement - ABC Corp' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'LC-2025-10-001' })
  @IsString()
  @IsNotEmpty()
  contractNumber: string;

  @ApiProperty({ enum: LegalContractType, example: LegalContractType.SERVICE_AGREEMENT })
  @IsEnum(LegalContractType)
  @IsNotEmpty()
  type: LegalContractType;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Party (customer/vendor)' })
  @IsUUID()
  @IsNotEmpty()
  partyId: string;

  @ApiProperty({ example: '2025-01-01', description: 'Effective date' })
  @IsDateString()
  @IsNotEmpty()
  effectiveDate: string;

  @ApiProperty({ example: '2026-12-31', description: 'Expiration date', required: false })
  @IsDateString()
  @IsOptional()
  expirationDate?: string;

  @ApiProperty({ example: 'This agreement is entered into...', description: 'Contract terms and conditions' })
  @IsString()
  @IsNotEmpty()
  terms: string;

  @ApiProperty({ example: 1000000, description: 'Contract value in currency', required: false })
  @IsOptional()
  contractValue?: number;

  @ApiProperty({ enum: LegalContractStatus, example: LegalContractStatus.DRAFT, required: false })
  @IsEnum(LegalContractStatus)
  @IsOptional()
  status?: LegalContractStatus;

  @ApiProperty({ type: [String], enum: ApprovalLevel, example: [ApprovalLevel.LEGAL_TEAM, ApprovalLevel.MANAGEMENT], required: false })
  @IsArray()
  @IsOptional()
  requiredApprovals?: ApprovalLevel[];

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Document ID if uploaded', required: false })
  @IsUUID()
  @IsOptional()
  documentId?: string;

  @ApiProperty({ example: 'High priority - requires urgent review', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

