import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, Min } from 'class-validator';

export enum FileFormat {
  EXCEL = 'excel',
  CSV = 'csv',
  XML = 'xml',
  JSON = 'json',
}

export class UploadStockCardDto {
  @ApiProperty({ example: 'stock_cards.xlsx', description: 'File name' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ enum: FileFormat, example: FileFormat.EXCEL })
  @IsEnum(FileFormat)
  @IsNotEmpty()
  format: FileFormat;

  @ApiProperty({ example: 'base64_file_data', description: 'File content in base64' })
  @IsString()
  @IsNotEmpty()
  fileData: string;

  @ApiProperty({ example: 102400, description: 'File size in bytes' })
  @IsNumber()
  @Min(0)
  fileSize: number;

  @ApiProperty({ example: true, description: 'Validate data before import', required: false })
  @IsOptional()
  validateBeforeImport?: boolean;

  @ApiProperty({ example: true, description: 'Update existing records if found', required: false })
  @IsOptional()
  updateExisting?: boolean;

  @ApiProperty({ example: true, description: 'Skip rows with errors', required: false })
  @IsOptional()
  skipErrors?: boolean;

  @ApiProperty({ type: [String], description: 'Specific columns to import', required: false })
  @IsArray()
  @IsOptional()
  columnsToImport?: string[];

  @ApiProperty({ example: 'Bulk import from supplier catalog', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

