import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsPhoneNumber, IsNumber, Min } from 'class-validator';

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  COLD_CALL = 'cold_call',
  TRADE_SHOW = 'trade_show',
  SOCIAL_MEDIA = 'social_media',
  EMAIL_CAMPAIGN = 'email_campaign',
  PARTNER = 'partner',
  OTHER = 'other',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  UNQUALIFIED = 'unqualified',
  CONVERTED = 'converted',
  LOST = 'lost',
}

export enum LeadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateLeadDto {
  @ApiProperty({ example: 'Jane Smith' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'XYZ Company' })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiProperty({ example: 'jane@xyz.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+905551234567' })
  @IsPhoneNumber('TR')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Operations Manager', required: false })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiProperty({ enum: LeadSource, example: LeadSource.WEBSITE })
  @IsEnum(LeadSource)
  @IsNotEmpty()
  source: LeadSource;

  @ApiProperty({ enum: LeadStatus, example: LeadStatus.NEW, required: false })
  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @ApiProperty({ enum: LeadPriority, example: LeadPriority.MEDIUM, required: false })
  @IsEnum(LeadPriority)
  @IsOptional()
  priority?: LeadPriority;

  @ApiProperty({ example: 500000, description: 'Estimated deal value', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedValue?: number;

  @ApiProperty({ example: 'Logistics', description: 'Industry sector', required: false })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiProperty({ example: 'Interested in warehouse management services', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'Istanbul, Turkey', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 'https://www.xyz-company.com', required: false })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({ example: 'warehousing, logistics', description: 'Tags for categorization', required: false })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiProperty({ example: 'Follow up next week', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

