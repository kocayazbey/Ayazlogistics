import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateTrackingDto {
  @ApiProperty({ example: 'TR-2024-001' })
  @IsString()
  trackingNumber: string;

  @ApiProperty({ example: '34 ABC 123' })
  @IsString()
  vehicle: string;

  @ApiProperty({ example: 'Mehmet Yılmaz' })
  @IsString()
  driver: string;

  @ApiProperty({ example: 'RT-2024-001' })
  @IsString()
  route: string;

  @ApiProperty({ example: 'İstanbul, Kadıköy' })
  @IsString()
  location: string;

  @ApiProperty({ example: '40.123456' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: '29.123456' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ example: '45 km/h' })
  @IsString()
  speed: string;

  @ApiProperty({ example: '12.5 km' })
  @IsString()
  distance: string;

  @ApiProperty({ example: '14:30' })
  @IsString()
  estimatedArrival: string;

  @ApiProperty({ example: 'High priority delivery' })
  @IsOptional()
  @IsString()
  notes?: string;
}
