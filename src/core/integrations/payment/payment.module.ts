import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PaymentController } from './payment.controller';
import { IyzicoService } from './iyzico.service';
import { StripeService } from './stripe.service';
import { EnhancedPaymentService } from './enhanced-payment.service';
import { PaymentStatusService } from './payment-status.service';
import { IntegrationFrameworkService } from '../integration-framework.service';
// import { FraudDetectionService } from '../../../modules/ai/fraud-detection.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    CacheModule.register(),
    DatabaseModule,
  ],
  controllers: [PaymentController],
  providers: [
    IyzicoService,
    StripeService,
    EnhancedPaymentService,
    PaymentStatusService,
    IntegrationFrameworkService,
    // FraudDetectionService, // Temporarily disabled
  ],
  exports: [
    IyzicoService,
    StripeService,
    EnhancedPaymentService,
    PaymentStatusService,
    // FraudDetectionService, // Temporarily disabled
  ],
})
export class PaymentModule {}

