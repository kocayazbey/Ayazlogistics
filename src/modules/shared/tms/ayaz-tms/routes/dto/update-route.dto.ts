import { PartialType } from '@nestjs/swagger';
import { CreateRouteDto } from './create-route.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRouteDto extends PartialType(CreateRouteDto) {
  @ApiPropertyOptional({ description: 'Route status', enum: ['planned', 'active', 'completed', 'cancelled'] })
  @IsOptional()
  @IsEnum(['planned', 'active', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: 'Update notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
