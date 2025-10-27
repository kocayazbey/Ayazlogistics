import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class AllocateLotDto {
  @ApiProperty({ description: 'Lot ID', example: 'LOT-001' })
  @IsString()
  lotId: string;

  @ApiProperty({ description: 'Quantity to allocate', example: 10 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Order ID', example: 'ORD-001' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ description: 'Allocation reason', example: 'Order fulfillment' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ description: 'Allocated by user ID', example: 'USER-001' })
  @IsString()
  @IsOptional()
  allocatedBy?: string;
}
