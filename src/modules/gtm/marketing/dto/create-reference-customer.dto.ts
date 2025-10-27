import { IsString, IsArray, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReferenceCustomerDto {
  @ApiProperty({ description: 'Company name', example: 'TechCorp Inc.' })
  @IsString()
  companyName: string;

  @ApiProperty({ description: 'Industry', example: 'Technology' })
  @IsString()
  industry: string;

  @ApiProperty({ description: 'Company logo URL', example: 'https://example.com/logo.png', required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ description: 'Customer testimonial', example: 'AyazLogistics helped us reduce delivery times by 40%' })
  @IsString()
  testimonial: string;

  @ApiProperty({ description: 'Achieved results', example: ['40% faster delivery', '25% cost reduction', '99.9% on-time delivery'] })
  @IsArray()
  @IsString({ each: true })
  results: string[];

  @ApiProperty({ description: 'Contact person name', example: 'John Smith' })
  @IsString()
  contactName: string;

  @ApiProperty({ description: 'Contact person title', example: 'VP of Operations' })
  @IsString()
  contactTitle: string;

  @ApiProperty({ description: 'Contact email', example: 'john.smith@techcorp.com' })
  @IsString()
  contactEmail: string;

  @ApiProperty({ description: 'Is public reference', example: true })
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({ description: 'Is customer active', example: true })
  @IsBoolean()
  isActive: boolean;
}
