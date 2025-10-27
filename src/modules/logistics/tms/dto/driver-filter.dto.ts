import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DriverStatus, LicenseClass } from './create-driver.dto';

export class DriverFilterDto {
  @ApiPropertyOptional({ enum: DriverStatus })
  @IsEnum(DriverStatus)
  @IsOptional()
  status?: DriverStatus;

  @ApiPropertyOptional({ enum: LicenseClass })
  @IsEnum(LicenseClass)
  @IsOptional()
  licenseClass?: LicenseClass;

  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  limit?: number;
}

