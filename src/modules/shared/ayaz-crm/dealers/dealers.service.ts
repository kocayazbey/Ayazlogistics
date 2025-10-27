import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, between } from 'drizzle-orm';
import { dealers } from '../../../../database/schema/shared/crm.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { CacheService } from '../../../../common/services/cache.service';

@Injectable()
export class DealersService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  async createDealer(data: any, tenantId: string, userId: string) {
    const dealerNumber = `DEALER-${Date.now()}`;

    const [dealer] = await this.db
      .insert(dealers)
      .values({
        tenantId,
        dealerNumber,
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        region: data.region,
        dealerType: data.dealerType,
        contractStartDate: data.contractStartDate,
        contractEndDate: data.contractEndDate,
        discountRate: data.discountRate,
        salesTarget: data.salesTarget,
        salesRepId: data.salesRepId || userId,
        isActive: true,
      })
      .returning();

    await this.eventBus.emit('dealer.created', { dealerId: dealer.id, tenantId });
    await this.cacheService.del(this.cacheService.generateKey('dealers', tenantId));

    return dealer;
  }

  async getDealers(tenantId: string, filters?: { region?: string; dealerType?: string; isActive?: boolean }) {
    const cacheKey = this.cacheService.generateKey('dealers', tenantId, JSON.stringify(filters || {}));
    
    return this.cacheService.wrap(cacheKey, async () => {
      let query = this.db.select().from(dealers).where(eq(dealers.tenantId, tenantId));

      if (filters?.region) {
        query = query.where(and(eq(dealers.tenantId, tenantId), eq(dealers.region, filters.region)));
      }

      if (filters?.dealerType) {
        query = query.where(and(eq(dealers.tenantId, tenantId), eq(dealers.dealerType, filters.dealerType)));
      }

      if (filters?.isActive !== undefined) {
        query = query.where(and(eq(dealers.tenantId, tenantId), eq(dealers.isActive, filters.isActive)));
      }

      return await query;
    }, 300);
  }

  async updateDealerSales(dealerId: string, salesAmount: number, tenantId: string) {
    const [dealer] = await this.db
      .select()
      .from(dealers)
      .where(and(eq(dealers.id, dealerId), eq(dealers.tenantId, tenantId)))
      .limit(1);

    if (!dealer) {
      throw new NotFoundException('Dealer not found');
    }

    const currentSales = parseFloat(dealer.currentSales || '0');
    const newSales = currentSales + salesAmount;
    const salesTarget = parseFloat(dealer.salesTarget || '0');
    const achievementRate = salesTarget > 0 ? (newSales / salesTarget) * 100 : 0;

    let performanceRating = 1;
    if (achievementRate >= 100) performanceRating = 5;
    else if (achievementRate >= 80) performanceRating = 4;
    else if (achievementRate >= 60) performanceRating = 3;
    else if (achievementRate >= 40) performanceRating = 2;

    const [updated] = await this.db
      .update(dealers)
      .set({
        currentSales: newSales.toString(),
        performanceRating,
        updatedAt: new Date(),
      })
      .where(eq(dealers.id, dealerId))
      .returning();

    await this.eventBus.emit('dealer.sales.updated', { dealerId, salesAmount, achievementRate, tenantId });
    await this.cacheService.del(this.cacheService.generateKey('dealers', tenantId));

    return updated;
  }

  async getDealerPerformance(dealerId: string, tenantId: string) {
    const [dealer] = await this.db
      .select()
      .from(dealers)
      .where(and(eq(dealers.id, dealerId), eq(dealers.tenantId, tenantId)))
      .limit(1);

    if (!dealer) {
      throw new NotFoundException('Dealer not found');
    }

    const salesTarget = parseFloat(dealer.salesTarget || '0');
    const currentSales = parseFloat(dealer.currentSales || '0');
    const achievementRate = salesTarget > 0 ? (currentSales / salesTarget) * 100 : 0;

    return {
      dealer,
      performance: {
        salesTarget,
        currentSales,
        remaining: salesTarget - currentSales,
        achievementRate,
        performanceRating: dealer.performanceRating,
      },
    };
  }
}
