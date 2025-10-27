import { IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLanguageDto {
  @ApiProperty({ description: 'Language code (ISO 639-1)', example: 'tr' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Language name', example: 'Turkish' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Native language name', example: 'Türkçe' })
  @IsString()
  nativeName: string;

  @ApiProperty({ description: 'Is right-to-left language', example: false })
  @IsBoolean()
  isRTL: boolean;

  @ApiProperty({ description: 'Is language active', example: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Is default language', example: false })
  @IsBoolean()
  isDefault: boolean;
}
