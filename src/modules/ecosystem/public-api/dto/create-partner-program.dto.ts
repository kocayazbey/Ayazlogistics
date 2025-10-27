import { IsString, IsArray, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePartnerProgramDto {
  @ApiProperty({ description: 'Program name', example: 'Technology Partner Program' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Program description', example: 'Partner program for technology companies' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Program tier', example: 'gold', enum: ['bronze', 'silver', 'gold', 'platinum'] })
  @IsEnum(['bronze', 'silver', 'gold', 'platinum'])
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';

  @ApiProperty({ description: 'Program requirements', example: ['Minimum 100 customers', 'API integration'] })
  @IsArray()
  @IsString({ each: true })
  requirements: string[];

  @ApiProperty({ description: 'Program benefits', example: ['Priority support', 'Co-marketing opportunities'] })
  @IsArray()
  @IsString({ each: true })
  benefits: string[];

  @ApiProperty({ description: 'Commission percentage', example: 15.0, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  commission: number;

  @ApiProperty({ description: 'Is program active', example: true })
  @IsBoolean()
  isActive: boolean;
}
