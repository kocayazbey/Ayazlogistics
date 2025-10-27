import { Module } from '@nestjs/common';
import { UsageTrackerService } from './usage-tracker.service';
import { UsageBillingService } from './usage-billing.service';
import { EventBusModule } from '../../../../core/events/event-bus.module';

@Module({
  imports: [EventBusModule],
  providers: [UsageTrackerService, UsageBillingService],
  exports: [UsageTrackerService, UsageBillingService],
})
export class UsageBasedBillingModule {}

