import { Module } from '@nestjs/common';
import { EInvoiceController } from './e-invoice.controller';
import { GIBEFaturaService } from './gib-e-fatura.service';

@Module({
  controllers: [EInvoiceController],
  providers: [GIBEFaturaService],
  exports: [GIBEFaturaService],
})
export class EInvoiceModule {}

