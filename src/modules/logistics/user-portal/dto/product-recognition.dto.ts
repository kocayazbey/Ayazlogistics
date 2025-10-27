import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class ProductRecognitionDto {
  @ApiProperty({ example: 'base64_image_data', description: 'Product image in base64 format' })
  @IsString()
  @IsNotEmpty()
  imageData: string;

  @ApiProperty({ example: 'image/jpeg', description: 'Image MIME type', required: false })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiProperty({ example: 0.85, description: 'Minimum confidence threshold (0-1)', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  confidenceThreshold?: number;

  @ApiProperty({ example: 5, description: 'Maximum number of results to return', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxResults?: number;

  @ApiProperty({ example: 'Electronics', description: 'Product category hint', required: false })
  @IsString()
  @IsOptional()
  categoryHint?: string;

  @ApiProperty({ example: 'Premium Brand', description: 'Brand hint', required: false })
  @IsString()
  @IsOptional()
  brandHint?: string;

  @ApiProperty({ example: 'Additional context for better recognition', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

