import { IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSDKDto {
  @ApiProperty({ description: 'SDK name', example: 'AyazLogistics Python SDK' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Programming language', example: 'python' })
  @IsString()
  language: string;

  @ApiProperty({ description: 'SDK version', example: '1.0.0' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'SDK description', example: 'Python SDK for AyazLogistics API' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Download URL', example: 'https://pypi.org/project/ayazlogistics/' })
  @IsString()
  downloadUrl: string;

  @ApiProperty({ description: 'Documentation URL', example: 'https://docs.ayazlogistics.com/python' })
  @IsString()
  documentationUrl: string;

  @ApiProperty({ description: 'Is SDK active', example: true })
  @IsBoolean()
  isActive: boolean;
}
