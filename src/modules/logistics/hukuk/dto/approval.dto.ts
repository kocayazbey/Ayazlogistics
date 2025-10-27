import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApprovalLevel } from './create-legal-contract.dto';

export enum ApprovalAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_CHANGES = 'request_changes',
}

export class ApprovalDto {
  @ApiProperty({ enum: ApprovalAction, example: ApprovalAction.APPROVE })
  @IsEnum(ApprovalAction)
  @IsNotEmpty()
  action: ApprovalAction;

  @ApiProperty({ enum: ApprovalLevel, example: ApprovalLevel.LEGAL_TEAM })
  @IsEnum(ApprovalLevel)
  @IsNotEmpty()
  approverLevel: ApprovalLevel;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  approverName: string;

  @ApiProperty({ example: 'Approved with no changes required' })
  @IsString()
  @IsNotEmpty()
  comments: string;

  @ApiProperty({ example: '2025-10-24T10:30:00Z', required: false })
  @IsDateString()
  @IsOptional()
  approvedAt?: string;

  @ApiProperty({ example: 'digital_signature_hash', description: 'Signature hash for audit trail', required: false })
  @IsString()
  @IsOptional()
  signatureHash?: string;
}

