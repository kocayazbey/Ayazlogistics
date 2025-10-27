import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApprovalLevel } from './create-legal-contract.dto';

export enum RejectionReason {
  TERMS_UNFAVORABLE = 'terms_unfavorable',
  COMPLIANCE_ISSUE = 'compliance_issue',
  FINANCIAL_CONCERN = 'financial_concern',
  LEGAL_RISK = 'legal_risk',
  MISSING_INFORMATION = 'missing_information',
  OTHER = 'other',
}

export class RejectionDto {
  @ApiProperty({ enum: ApprovalLevel, example: ApprovalLevel.LEGAL_TEAM })
  @IsEnum(ApprovalLevel)
  @IsNotEmpty()
  rejectorLevel: ApprovalLevel;

  @ApiProperty({ example: 'Jane Smith' })
  @IsString()
  @IsNotEmpty()
  rejectorName: string;

  @ApiProperty({ type: [String], enum: RejectionReason, example: [RejectionReason.LEGAL_RISK, RejectionReason.COMPLIANCE_ISSUE] })
  @IsArray()
  @IsNotEmpty()
  reasons: RejectionReason[];

  @ApiProperty({ example: 'The contract poses significant legal risk due to liability clauses...' })
  @IsString()
  @IsNotEmpty()
  detailedComments: string;

  @ApiProperty({ example: 'Revise liability clauses in section 5', description: 'Required changes', required: false })
  @IsString()
  @IsOptional()
  requiredChanges?: string;

  @ApiProperty({ example: true, description: 'Can be resubmitted after changes', required: false })
  @IsOptional()
  allowResubmission?: boolean;
}

