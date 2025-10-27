import { Module } from '@nestjs/common';
import { MobileBillingController } from './mobile-billing.controller';
import { MobileBillingService } from './mobile-billing.service';
import { DatabaseModule } from '../../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MobileBillingController],
  providers: [MobileBillingService],
  exports: [MobileBillingService],
})
export class MobileBillingModule {}
