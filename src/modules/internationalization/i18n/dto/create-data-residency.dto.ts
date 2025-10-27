import { IsString, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDataResidencyDto {
  @ApiProperty({ description: 'Region name', example: 'Europe' })
  @IsString()
  region: string;

  @ApiProperty({ description: 'Country name', example: 'Germany' })
  @IsString()
  country: string;

  @ApiProperty({ description: 'Data center location', example: 'Frankfurt' })
  @IsString()
  dataCenter: string;

  @ApiProperty({ description: 'Compliance standards', example: ['GDPR', 'ISO27001'] })
  @IsArray()
  @IsString({ each: true })
  compliance: string[];

  @ApiProperty({ description: 'Is data residency active', example: true })
  @IsBoolean()
  isActive: boolean;
}
