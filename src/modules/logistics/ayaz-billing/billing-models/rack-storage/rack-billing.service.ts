import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between } from 'drizzle-orm';
import { usageTracking, billingRates } from '../../../../../database/schema/logistics/billing.schema';
import { EventBusService } from '../../../../../core/events/event-bus.service';

@Injectable()
export class RackBillingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async trackRackUsage(
    contractId: string,
    locationId: string,
    rackCount: number,
    usageDate: Date,
    tenantId: string
  ) {
    const [rate] = await this.db
      .select()
      .from(billingRates)
      .where(
        and(
          eq(billingRates.contractId, contractId),
          eq(billingRates.rateType, 'rack_storage')
        )
      )
      .limit(1);

    if (!rate) {
      throw new Error('Billing rate not found for rack storage');
    }

    const rateAmount = parseFloat(rate.rateAmount);
    const totalAmount = rackCount * rateAmount;

    const [usage] = await this.db
      .insert(usageTracking)
      .values({
        tenantId,
        contractId,
        usageType: 'rack_storage',
        resourceId: locationId,
        quantity: rackCount.toString(),
        unitOfMeasure: rate.unitOfMeasure || 'pallet_position',
        rateAmount: rateAmount.toString(),
        totalAmount: totalAmount.toString(),
        usageDate,
        metadata: { locationId, rackCount },
      })
      .returning();

    await this.eventBus.emit('rack_usage.tracked', { 
      usageId: usage.id, 
      contractId, 
      tenantId,
      rackCount,
      amount: totalAmount,
    });

    return usage;
  }

  async getRackUsage(contractId: string, startDate: Date, endDate: Date) {
    return await this.db
      .select()
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.contractId, contractId),
          eq(usageTracking.usageType, 'rack_storage'),
          between(usageTracking.usageDate, startDate, endDate)
        )
      );
  }

  async calculateMonthlyRackCost(contractId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const usage = await this.getRackUsage(contractId, startDate, endDate);

    const totalRackDays = usage.reduce((sum, u) => sum + parseFloat(u.quantity || '0'), 0);
    const totalCost = usage.reduce((sum, u) => sum + parseFloat(u.totalAmount || '0'), 0);

    return {
      contractId,
      period: { month, year },
      totalRackDays,
      totalCost,
      averageRackUsage: usage.length > 0 ? totalRackDays / usage.length : 0,
    };
  }
}

