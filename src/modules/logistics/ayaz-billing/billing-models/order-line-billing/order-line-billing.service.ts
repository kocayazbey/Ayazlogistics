import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between } from 'drizzle-orm';
import { usageTracking, billingRates } from '../../../../../database/schema/logistics/billing.schema';
import { EventBusService } from '../../../../../core/events/event-bus.service';

interface OrderLineActivity {
  contractId: string;
  orderId: string;
  orderNumber: string;
  lineCount: number;
  orderType: 'inbound' | 'outbound' | 'transfer';
  complexity?: 'standard' | 'multi_sku' | 'complex';
  timestamp: Date;
}

@Injectable()
export class OrderLineBillingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async recordOrderLineActivity(activity: OrderLineActivity, tenantId: string) {
    const [rate] = await this.db
      .select()
      .from(billingRates)
      .where(
        and(
          eq(billingRates.contractId, activity.contractId),
          eq(billingRates.rateType, `order_line_${activity.orderType}`)
        )
      )
      .limit(1);

    let rateAmount = 0;
    
    if (rate) {
      rateAmount = parseFloat(rate.rateAmount || '0');
    } else {
      rateAmount = this.getStandardOrderLineRate(activity.orderType, activity.complexity);
    }

    const totalAmount = activity.lineCount * rateAmount;

    const [usage] = await this.db
      .insert(usageTracking)
      .values({
        tenantId,
        contractId: activity.contractId,
        usageType: `order_line_${activity.orderType}`,
        resourceId: activity.orderId,
        quantity: activity.lineCount.toString(),
        unitOfMeasure: 'line',
        rateAmount: rateAmount.toString(),
        totalAmount: totalAmount.toString(),
        usageDate: activity.timestamp,
        invoiced: false,
        metadata: {
          orderId: activity.orderId,
          orderNumber: activity.orderNumber,
          orderType: activity.orderType,
          lineCount: activity.lineCount,
          complexity: activity.complexity,
        },
      })
      .returning();

    await this.eventBus.emit('order_line.activity.recorded', {
      usageId: usage.id,
      contractId: activity.contractId,
      orderType: activity.orderType,
      lineCount: activity.lineCount,
      totalAmount,
      tenantId,
    });

    return usage;
  }

  private getStandardOrderLineRate(orderType: string, complexity?: string): number {
    const baseRates = {
      'inbound': {
        'standard': 1.5,
        'multi_sku': 2.0,
        'complex': 3.5,
      },
      'outbound': {
        'standard': 2.0,
        'multi_sku': 2.5,
        'complex': 4.0,
      },
      'transfer': {
        'standard': 1.0,
        'multi_sku': 1.5,
        'complex': 2.5,
      },
    };

    const complexityLevel = complexity || 'standard';
    return baseRates[orderType]?.[complexityLevel] || 2.0;
  }

  async calculateOrderLineCost(data: {
    contractId: string;
    orders: Array<{
      orderType: 'inbound' | 'outbound' | 'transfer';
      lineCount: number;
      complexity?: string;
    }>;
  }): Promise<any> {
    let totalCost = 0;
    const breakdown = [];

    for (const order of data.orders) {
      const rate = this.getStandardOrderLineRate(order.orderType, order.complexity);
      const cost = order.lineCount * rate;
      totalCost += cost;

      breakdown.push({
        orderType: order.orderType,
        lineCount: order.lineCount,
        complexity: order.complexity || 'standard',
        rate,
        cost,
      });
    }

    return {
      contractId: data.contractId,
      totalCost,
      breakdown,
      currency: 'TRY',
    };
  }

  async getOrderLineUsageReport(
    contractId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<any> {
    const usage = await this.db
      .select()
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.contractId, contractId),
          eq(usageTracking.tenantId, tenantId),
          between(usageTracking.usageDate, startDate, endDate)
        )
      );

    const orderLineRecords = usage.filter(u => u.usageType?.startsWith('order_line_'));

    const byOrderType: Record<string, any> = {};

    for (const record of orderLineRecords) {
      const orderType = record.usageType?.replace('order_line_', '') || 'unknown';

      if (!byOrderType[orderType]) {
        byOrderType[orderType] = {
          orderType,
          totalLines: 0,
          totalAmount: 0,
          orderCount: 0,
        };
      }

      byOrderType[orderType].totalLines += parseFloat(record.quantity || '0');
      byOrderType[orderType].totalAmount += parseFloat(record.totalAmount || '0');
      byOrderType[orderType].orderCount++;
    }

    const totalAmount = Object.values(byOrderType).reduce(
      (sum: number, item: any) => sum + item.totalAmount, 
      0
    );

    const totalLines = Object.values(byOrderType).reduce(
      (sum: number, item: any) => sum + item.totalLines, 
      0
    );

    return {
      contractId,
      period: { startDate, endDate },
      byOrderType: Object.values(byOrderType),
      totalLines,
      totalAmount,
      currency: 'TRY',
    };
  }

  async applyVolumeDiscount(lineCount: number, baseAmount: number): Promise<any> {
    let discountPercentage = 0;

    if (lineCount > 10000) {
      discountPercentage = 20;
    } else if (lineCount > 5000) {
      discountPercentage = 15;
    } else if (lineCount > 2000) {
      discountPercentage = 10;
    } else if (lineCount > 1000) {
      discountPercentage = 5;
    }

    const discountAmount = (baseAmount * discountPercentage) / 100;
    const finalAmount = baseAmount - discountAmount;

    return {
      lineCount,
      baseAmount,
      discountPercentage,
      discountAmount,
      finalAmount,
      currency: 'TRY',
    };
  }
}

