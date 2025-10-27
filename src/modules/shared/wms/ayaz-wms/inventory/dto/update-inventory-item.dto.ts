import { PartialType } from '@nestjs/swagger';
import { CreateInventoryItemDto } from './create-inventory-item.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInventoryItemDto extends PartialType(CreateInventoryItemDto) {
  @ApiPropertyOptional({ description: 'Item status', enum: ['active', 'inactive', 'discontinued'] })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'discontinued'])
  status?: string;

  @ApiPropertyOptional({ description: 'Update notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
