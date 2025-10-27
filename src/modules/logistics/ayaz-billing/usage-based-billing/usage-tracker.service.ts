import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between, sql } from 'drizzle-orm';
import { usageTracking, billingRates, billingContracts } from '../../../../database/schema/logistics/billing.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface UsageRecord {
  tenantId: string;
  contractId: string;
  usageType: string;
  resourceId?: string;
  quantity: number;
  unitOfMeasure: string;
  usageDate: Date;
  usageStartTime?: Date;
  usageEndTime?: Date;
  metadata?: any;
}

interface AggregatedUsage {
  usageType: string;
  totalQuantity: number;
  unitOfMeasure: string;
  rateAmount: number;
  totalAmount: number;
  recordCount: number;
}

@Injectable()
export class UsageTrackerService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async recordUsage(record: UsageRecord): Promise<any> {
    const rate = await this.findActiveRate(
      record.contractId,
      record.usageType,
      record.usageDate,
    );

    if (!rate) {
      throw new Error(
        `No active rate found for ${record.usageType} on ${record.usageDate}`,
      );
    }

    const rateAmount = parseFloat(rate.rateAmount);
    const totalAmount = record.quantity * rateAmount;

    const [usage] = await this.db
      .insert(usageTracking)
      .values({
        tenantId: record.tenantId,
        contractId: record.contractId,
        usageType: record.usageType,
        resourceId: record.resourceId,
        quantity: record.quantity.toString(),
        unitOfMeasure: record.unitOfMeasure,
        rateAmount: rateAmount.toString(),
        totalAmount: totalAmount.toString(),
        usageDate: record.usageDate,
        usageStartTime: record.usageStartTime,
        usageEndTime: record.usageEndTime,
        invoiced: false,
        metadata: record.metadata,
      })
      .returning();

    await this.eventBus.publish('billing.usage.recorded', {
      usageId: usage.id,
      contractId: record.contractId,
      usageType: record.usageType,
      quantity: record.quantity,
      totalAmount,
    });

    return usage;
  }

  async bulkRecordUsage(records: UsageRecord[]): Promise<any[]> {
    const usages = [];

    for (const record of records) {
      const rate = await this.findActiveRate(
        record.contractId,
        record.usageType,
        record.usageDate,
      );

      if (!rate) {
        console.warn(
          `No active rate found for ${record.usageType} on ${record.usageDate}, skipping`,
        );
        continue;
      }

      const rateAmount = parseFloat(rate.rateAmount);
      const totalAmount = record.quantity * rateAmount;

      usages.push({
        tenantId: record.tenantId,
        contractId: record.contractId,
        usageType: record.usageType,
        resourceId: record.resourceId,
        quantity: record.quantity.toString(),
        unitOfMeasure: record.unitOfMeasure,
        rateAmount: rateAmount.toString(),
        totalAmount: totalAmount.toString(),
        usageDate: record.usageDate,
        usageStartTime: record.usageStartTime,
        usageEndTime: record.usageEndTime,
        invoiced: false,
        metadata: record.metadata,
      });
    }

    if (usages.length === 0) {
      return [];
    }

    const insertedUsages = await this.db
      .insert(usageTracking)
      .values(usages)
      .returning();

    await this.eventBus.publish('billing.usage.bulk_recorded', {
      count: insertedUsages.length,
      contracts: [...new Set(records.map((r) => r.contractId))],
    });

    return insertedUsages;
  }

  async getUsageByPeriod(
    contractId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return await this.db
      .select()
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.contractId, contractId),
          between(usageTracking.usageDate, startDate, endDate),
        ),
      )
      .orderBy(usageTracking.usageDate);
  }

  async getAggregatedUsageByPeriod(
    contractId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AggregatedUsage[]> {
    const results = await this.db
      .select({
        usageType: usageTracking.usageType,
        totalQuantity: sql<number>`SUM(${usageTracking.quantity}::numeric)`,
        totalAmount: sql<number>`SUM(${usageTracking.totalAmount}::numeric)`,
        unitOfMeasure: usageTracking.unitOfMeasure,
        rateAmount: usageTracking.rateAmount,
        recordCount: sql<number>`COUNT(*)`,
      })
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.contractId, contractId),
          between(usageTracking.usageDate, startDate, endDate),
          eq(usageTracking.invoiced, false),
        ),
      )
      .groupBy(
        usageTracking.usageType,
        usageTracking.unitOfMeasure,
        usageTracking.rateAmount,
      );

    return results.map((r) => ({
      usageType: r.usageType,
      totalQuantity: r.totalQuantity,
      unitOfMeasure: r.unitOfMeasure,
      rateAmount: parseFloat(r.rateAmount),
      totalAmount: r.totalAmount,
      recordCount: r.recordCount,
    }));
  }

  async getUninvoicedUsage(contractId: string): Promise<any[]> {
    return await this.db
      .select()
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.contractId, contractId),
          eq(usageTracking.invoiced, false),
        ),
      )
      .orderBy(usageTracking.usageDate);
  }

  async markAsInvoiced(usageIds: string[], invoiceId: string): Promise<void> {
    await this.db
      .update(usageTracking)
      .set({ invoiced: true, invoiceId })
      .where(sql`${usageTracking.id} = ANY(${usageIds})`);

    await this.eventBus.publish('billing.usage.invoiced', {
      invoiceId,
      usageCount: usageIds.length,
    });
  }

  async getUsageByResource(
    contractId: string,
    resourceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    const conditions = [
      eq(usageTracking.contractId, contractId),
      eq(usageTracking.resourceId, resourceId),
    ];

    if (startDate && endDate) {
      conditions.push(between(usageTracking.usageDate, startDate, endDate));
    }

    return await this.db
      .select()
      .from(usageTracking)
      .where(and(...conditions))
      .orderBy(usageTracking.usageDate);
  }

  async deleteUsage(usageId: string): Promise<void> {
    const [usage] = await this.db
      .select()
      .from(usageTracking)
      .where(eq(usageTracking.id, usageId))
      .limit(1);

    if (!usage) {
      throw new Error('Usage record not found');
    }

    if (usage.invoiced) {
      throw new Error('Cannot delete invoiced usage record');
    }

    await this.db.delete(usageTracking).where(eq(usageTracking.id, usageId));

    await this.eventBus.publish('billing.usage.deleted', {
      usageId,
      contractId: usage.contractId,
    });
  }

  private async findActiveRate(
    contractId: string,
    rateType: string,
    usageDate: Date,
  ): Promise<any> {
    const [rate] = await this.db
      .select()
      .from(billingRates)
      .where(
        and(
          eq(billingRates.contractId, contractId),
          eq(billingRates.rateType, rateType),
          sql`${billingRates.validFrom} <= ${usageDate}`,
          sql`(${billingRates.validUntil} IS NULL OR ${billingRates.validUntil} >= ${usageDate})`,
        ),
      )
      .limit(1);

    return rate;
  }

  async getUsageStats(
    contractId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const aggregated = await this.getAggregatedUsageByPeriod(
      contractId,
      startDate,
      endDate,
    );

    const totalAmount = aggregated.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalRecords = aggregated.reduce((sum, item) => sum + item.recordCount, 0);

    return {
      period: { startDate, endDate },
      contractId,
      totalAmount,
      totalRecords,
      breakdown: aggregated,
    };
  }
}

