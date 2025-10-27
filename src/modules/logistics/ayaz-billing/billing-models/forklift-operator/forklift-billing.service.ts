import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between } from 'drizzle-orm';
import { usageTracking, billingRates } from '../../../../../database/schema/logistics/billing.schema';
import { EventBusService } from '../../../../../core/events/event-bus.service';

@Injectable()
export class ForkliftBillingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async trackForkliftUsage(
    contractId: string,
    forkliftId: string,
    operatorId: string,
    startTime: Date,
    endTime: Date,
    tenantId: string
  ) {
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    const [rate] = await this.db
      .select()
      .from(billingRates)
      .where(
        and(
          eq(billingRates.contractId, contractId),
          eq(billingRates.rateType, 'forklift_operator')
        )
      )
      .limit(1);

    if (!rate) {
      throw new Error('Billing rate not found for forklift+operator');
    }

    const rateAmount = parseFloat(rate.rateAmount);
    const totalAmount = hours * rateAmount;

    const [usage] = await this.db
      .insert(usageTracking)
      .values({
        tenantId,
        contractId,
        usageType: 'forklift_operator',
        resourceId: forkliftId,
        quantity: hours.toString(),
        unitOfMeasure: 'hour',
        rateAmount: rateAmount.toString(),
        totalAmount: totalAmount.toString(),
        usageDate: startTime,
        usageStartTime: startTime,
        usageEndTime: endTime,
        metadata: { forkliftId, operatorId },
      })
      .returning();

    await this.eventBus.emit('forklift_usage.tracked', { 
      usageId: usage.id, 
      contractId, 
      tenantId,
      hours,
      amount: totalAmount,
    });

    return usage;
  }

  async getForkliftUsage(contractId: string, startDate: Date, endDate: Date) {
    return await this.db
      .select()
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.contractId, contractId),
          eq(usageTracking.usageType, 'forklift_operator'),
          between(usageTracking.usageDate, startDate, endDate)
        )
      );
  }

  async calculateMonthlyForkliftCost(contractId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const usage = await this.getForkliftUsage(contractId, startDate, endDate);

    const totalHours = usage.reduce((sum, u) => sum + parseFloat(u.quantity || '0'), 0);
    const totalCost = usage.reduce((sum, u) => sum + parseFloat(u.totalAmount || '0'), 0);

    return {
      contractId,
      period: { month, year },
      totalHours,
      totalCost,
      usageCount: usage.length,
    };
  }
}

