import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ScanBarcodeDto {
  @ApiProperty({ description: 'Barcode or SKU to scan', example: '1234567890123' })
  @IsString()
  @IsNotEmpty()
  barcode: string;
}
