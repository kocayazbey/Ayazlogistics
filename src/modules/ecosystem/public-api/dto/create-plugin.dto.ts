import { IsString, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePluginDto {
  @ApiProperty({ description: 'Plugin name', example: 'Advanced Analytics' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Plugin description', example: 'Advanced analytics and reporting plugin' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Plugin version', example: '1.0.0' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Plugin category', example: 'analytics' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Plugin price', example: 99.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Currency', example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Developer name', example: 'AyazLogistics Team' })
  @IsString()
  developer: string;

  @ApiProperty({ description: 'Download URL', example: 'https://plugins.ayazlogistics.com/advanced-analytics' })
  @IsString()
  downloadUrl: string;

  @ApiProperty({ description: 'Is plugin active', example: true })
  @IsBoolean()
  isActive: boolean;
}
