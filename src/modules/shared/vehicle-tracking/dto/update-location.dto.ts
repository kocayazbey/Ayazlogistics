import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({ description: 'Latitude', example: 41.0082 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 28.9784 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: 'Address', example: 'Istanbul, Turkey' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'Speed in km/h', example: 60 })
  @IsNumber()
  @IsOptional()
  speed?: number;

  @ApiProperty({ description: 'Heading in degrees', example: 45 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(360)
  heading?: number;

  @ApiProperty({ description: 'Altitude in meters', example: 100 })
  @IsNumber()
  @IsOptional()
  altitude?: number;
}
