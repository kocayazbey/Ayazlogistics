import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEDIMappingDto {
  @ApiProperty({ description: 'Connection ID', example: 'EDI-1234567890' })
  @IsString()
  connectionId: string;

  @ApiProperty({ description: 'Document type', example: '850' })
  @IsString()
  documentType: string;

  @ApiProperty({ description: 'Source field', example: 'N1*BT*COMPANY NAME' })
  @IsString()
  sourceField: string;

  @ApiProperty({ description: 'Target field', example: 'customer_name' })
  @IsString()
  targetField: string;

  @ApiProperty({ description: 'Transformation rule', example: 'UPPER(TRIM(field))', required: false })
  @IsOptional()
  @IsString()
  transformation?: string;

  @ApiProperty({ description: 'Is field required', example: true })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ description: 'Default value', example: 'N/A', required: false })
  @IsOptional()
  @IsString()
  defaultValue?: string;
}
