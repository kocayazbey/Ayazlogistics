import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { InvoicingController } from './invoicing.controller';
import { InvoicingService } from './invoicing.service';
import { DatabaseModule } from '../../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AccountingController, InvoicingController],
  providers: [AccountingService, InvoicingService],
  exports: [AccountingService, InvoicingService],
})
export class AccountingModule {}
