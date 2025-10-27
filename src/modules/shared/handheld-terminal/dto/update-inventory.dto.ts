import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateInventoryDto {
  @ApiProperty({ description: 'Inventory ID', example: 'INV-001' })
  @IsString()
  inventoryId: string;

  @ApiProperty({ description: 'New quantity', example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Update notes', example: 'Cycle count adjustment' })
  @IsString()
  @IsOptional()
  notes?: string;
}
