import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ThreeDSecureService } from './three-d-secure.service';
import { PaymentProcessorService } from './payment-processor.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    ThreeDSecureService,
    PaymentProcessorService,
  ],
  exports: [
    PaymentService,
    ThreeDSecureService,
    PaymentProcessorService,
  ],
})
export class PaymentModule {}
