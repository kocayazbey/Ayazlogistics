import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';

export class CreateDriverDto {
  @ApiProperty({ example: 'Mehmet Yılmaz' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'mehmet.yilmaz@ayazlogistics.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: '+90 532 123 45 67' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'A123456789' })
  @IsString()
  licenseNumber: string;

  @ApiProperty({ example: 'B+E' })
  @IsString()
  licenseType: string;

  @ApiProperty({ example: '5 yıl' })
  @IsString()
  experience: string;

  @ApiProperty({ example: 4.8 })
  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'İstanbul, Kadıköy' })
  @IsString()
  location: string;

  @ApiProperty({ example: 'Experienced driver' })
  @IsOptional()
  @IsString()
  notes?: string;
}