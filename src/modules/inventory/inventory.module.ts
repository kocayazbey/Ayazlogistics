import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ScannerController } from './scanner.controller';
import { ScannerService } from './scanner.service';
import { BarcodeValidatorService } from './barcode-validator.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ScannerController],
  providers: [ScannerService, BarcodeValidatorService],
  exports: [ScannerService, BarcodeValidatorService],
})
export class InventoryModule {}
