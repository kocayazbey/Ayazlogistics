import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DealerType, DealerStatus } from './create-dealer.dto';

export class DealerFilterDto {
  @ApiPropertyOptional({ enum: DealerType })
  @IsEnum(DealerType)
  @IsOptional()
  type?: DealerType;

  @ApiPropertyOptional({ enum: DealerStatus })
  @IsEnum(DealerStatus)
  @IsOptional()
  status?: DealerStatus;

  @ApiPropertyOptional({ example: 'Istanbul' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Turkey' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'Marmara' })
  @IsString()
  @IsOptional()
  territory?: string;

  @ApiPropertyOptional({ example: 'Premium' })
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

