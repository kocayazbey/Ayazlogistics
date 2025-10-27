import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { usageTracking, billingRates } from '../../../../../database/schema/logistics/billing.schema';
import { EventBusService } from '../../../../../core/events/event-bus.service';

@Injectable()
export class WaitingTimeBillingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async trackWaitingTime(
    contractId: string,
    resourceType: string,
    resourceId: string,
    waitingHours: number,
    waitingDate: Date,
    tenantId: string
  ) {
    const [rate] = await this.db
      .select()
      .from(billingRates)
      .where(
        and(
          eq(billingRates.contractId, contractId),
          eq(billingRates.rateType, 'waiting_time')
        )
      )
      .limit(1);

    if (!rate) {
      throw new Error('Billing rate not found for waiting time');
    }

    const rateAmount = parseFloat(rate.rateAmount);
    const totalAmount = waitingHours * rateAmount;

    const [usage] = await this.db
      .insert(usageTracking)
      .values({
        tenantId,
        contractId,
        usageType: 'waiting_time',
        resourceId,
        quantity: waitingHours.toString(),
        unitOfMeasure: 'hour',
        rateAmount: rateAmount.toString(),
        totalAmount: totalAmount.toString(),
        usageDate: waitingDate,
        metadata: { resourceType, resourceId },
      })
      .returning();

    await this.eventBus.emit('waiting_time.tracked', { 
      usageId: usage.id, 
      contractId, 
      tenantId,
      waitingHours,
      amount: totalAmount,
    });

    return usage;
  }

  async calculateDailyWaitingCharge(contractId: string, date: Date) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const usage = await this.db
      .select()
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.contractId, contractId),
          eq(usageTracking.usageType, 'waiting_time'),
          between(usageTracking.usageDate, startOfDay, endOfDay)
        )
      );

    const totalHours = usage.reduce((sum, u) => sum + parseFloat(u.quantity || '0'), 0);
    const totalCost = usage.reduce((sum, u) => sum + parseFloat(u.totalAmount || '0'), 0);

    return {
      contractId,
      date,
      totalHours,
      totalCost,
      records: usage,
    };
  }
}

