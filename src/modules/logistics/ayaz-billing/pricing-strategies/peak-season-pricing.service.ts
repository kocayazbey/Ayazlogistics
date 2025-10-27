import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between, sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, decimal, date, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { tenants } from '../../../../database/schema/core/tenants.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

export const seasonalPricingRules = pgTable('seasonal_pricing_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  ruleName: varchar('rule_name', { length: 255 }).notNull(),
  seasonType: varchar('season_type', { length: 50 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  applicableServiceTypes: jsonb('applicable_service_types'),
  adjustmentType: varchar('adjustment_type', { length: 20 }).notNull(),
  adjustmentValue: decimal('adjustment_value', { precision: 10, scale: 2 }).notNull(),
  minimumCharge: decimal('minimum_charge', { precision: 12, scale: 2 }),
  maximumCharge: decimal('maximum_charge', { precision: 12, scale: 2 }),
  priority: varchar('priority', { length: 10 }).default('medium'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

interface SeasonalRule {
  id: string;
  ruleName: string;
  seasonType: string;
  startDate: Date;
  endDate: Date;
  applicableServiceTypes: string[];
  adjustmentType: 'percentage' | 'fixed_amount';
  adjustmentValue: number;
  minimumCharge?: number;
  maximumCharge?: number;
  priority: 'low' | 'medium' | 'high';
}

interface PriceCalculation {
  basePrice: number;
  seasonalAdjustment: number;
  finalPrice: number;
  appliedRule?: SeasonalRule;
  seasonType?: string;
}

@Injectable()
export class PeakSeasonPricingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createSeasonalRule(
    tenantId: string,
    data: {
      ruleName: string;
      seasonType: string;
      startDate: Date;
      endDate: Date;
      applicableServiceTypes?: string[];
      adjustmentType: 'percentage' | 'fixed_amount';
      adjustmentValue: number;
      minimumCharge?: number;
      maximumCharge?: number;
      priority?: 'low' | 'medium' | 'high';
    },
  ): Promise<any> {
    const [rule] = await this.db
      .insert(seasonalPricingRules)
      .values({
        tenantId,
        ruleName: data.ruleName,
        seasonType: data.seasonType,
        startDate: data.startDate,
        endDate: data.endDate,
        applicableServiceTypes: data.applicableServiceTypes || [],
        adjustmentType: data.adjustmentType,
        adjustmentValue: data.adjustmentValue.toString(),
        minimumCharge: data.minimumCharge?.toString(),
        maximumCharge: data.maximumCharge?.toString(),
        priority: data.priority || 'medium',
        isActive: true,
      })
      .returning();

    await this.eventBus.publish('billing.seasonal_rule.created', {
      ruleId: rule.id,
      seasonType: data.seasonType,
      adjustmentType: data.adjustmentType,
    });

    return rule;
  }

  async calculateSeasonalPrice(
    tenantId: string,
    serviceType: string,
    basePrice: number,
    date: Date,
  ): Promise<PriceCalculation> {
    const activeRule = await this.findActiveSeasonalRule(
      tenantId,
      serviceType,
      date,
    );

    if (!activeRule) {
      return {
        basePrice,
        seasonalAdjustment: 0,
        finalPrice: basePrice,
      };
    }

    let adjustment = 0;
    let finalPrice = basePrice;

    if (activeRule.adjustmentType === 'percentage') {
      adjustment = (basePrice * parseFloat(activeRule.adjustmentValue)) / 100;
      finalPrice = basePrice + adjustment;
    } else if (activeRule.adjustmentType === 'fixed_amount') {
      adjustment = parseFloat(activeRule.adjustmentValue);
      finalPrice = basePrice + adjustment;
    }

    if (activeRule.minimumCharge) {
      const minCharge = parseFloat(activeRule.minimumCharge);
      if (finalPrice < minCharge) {
        finalPrice = minCharge;
      }
    }

    if (activeRule.maximumCharge) {
      const maxCharge = parseFloat(activeRule.maximumCharge);
      if (finalPrice > maxCharge) {
        finalPrice = maxCharge;
      }
    }

    await this.eventBus.publish('billing.seasonal_price.calculated', {
      serviceType,
      basePrice,
      finalPrice,
      seasonType: activeRule.seasonType,
      adjustmentValue: parseFloat(activeRule.adjustmentValue),
    });

    return {
      basePrice,
      seasonalAdjustment: adjustment,
      finalPrice,
      appliedRule: this.mapToSeasonalRule(activeRule),
      seasonType: activeRule.seasonType,
    };
  }

  async getActiveSeasonalRules(tenantId: string, date: Date): Promise<any[]> {
    return await this.db
      .select()
      .from(seasonalPricingRules)
      .where(
        and(
          eq(seasonalPricingRules.tenantId, tenantId),
          eq(seasonalPricingRules.isActive, true),
          sql`${seasonalPricingRules.startDate} <= ${date}`,
          sql`${seasonalPricingRules.endDate} >= ${date}`,
        ),
      )
      .orderBy(seasonalPricingRules.priority);
  }

  async updateSeasonalRule(
    ruleId: string,
    updates: {
      ruleName?: string;
      startDate?: Date;
      endDate?: Date;
      adjustmentValue?: number;
      isActive?: boolean;
    },
  ): Promise<any> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.ruleName) updateData.ruleName = updates.ruleName;
    if (updates.startDate) updateData.startDate = updates.startDate;
    if (updates.endDate) updateData.endDate = updates.endDate;
    if (updates.adjustmentValue)
      updateData.adjustmentValue = updates.adjustmentValue.toString();
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const [updated] = await this.db
      .update(seasonalPricingRules)
      .set(updateData)
      .where(eq(seasonalPricingRules.id, ruleId))
      .returning();

    await this.eventBus.publish('billing.seasonal_rule.updated', {
      ruleId: updated.id,
    });

    return updated;
  }

  async deleteSeasonalRule(ruleId: string): Promise<void> {
    await this.db
      .delete(seasonalPricingRules)
      .where(eq(seasonalPricingRules.id, ruleId));

    await this.eventBus.publish('billing.seasonal_rule.deleted', { ruleId });
  }

  async getPredefinedSeasons(): Promise<any[]> {
    const currentYear = new Date().getFullYear();

    return [
      {
        seasonType: 'peak_holiday',
        name: 'Yılbaşı ve Yeni Yıl Sezonu',
        startDate: new Date(currentYear, 11, 15),
        endDate: new Date(currentYear + 1, 0, 15),
        suggestedAdjustment: 25,
      },
      {
        seasonType: 'ramadan',
        name: 'Ramazan Sezonu',
        startDate: new Date(currentYear, 2, 1),
        endDate: new Date(currentYear, 3, 10),
        suggestedAdjustment: 20,
      },
      {
        seasonType: 'back_to_school',
        name: 'Okul Dönemi',
        startDate: new Date(currentYear, 8, 1),
        endDate: new Date(currentYear, 8, 30),
        suggestedAdjustment: 15,
      },
      {
        seasonType: 'black_friday',
        name: 'Black Friday Sezonu',
        startDate: new Date(currentYear, 10, 20),
        endDate: new Date(currentYear, 11, 5),
        suggestedAdjustment: 30,
      },
      {
        seasonType: 'summer_high',
        name: 'Yaz Yoğunluğu',
        startDate: new Date(currentYear, 5, 1),
        endDate: new Date(currentYear, 7, 31),
        suggestedAdjustment: 10,
      },
    ];
  }

  async applyBulkSeasonalPricing(
    tenantId: string,
    serviceType: string,
    basePrices: Array<{ itemId: string; basePrice: number; date: Date }>,
  ): Promise<Array<{ itemId: string; calculation: PriceCalculation }>> {
    const results = [];

    for (const item of basePrices) {
      const calculation = await this.calculateSeasonalPrice(
        tenantId,
        serviceType,
        item.basePrice,
        item.date,
      );

      results.push({
        itemId: item.itemId,
        calculation,
      });
    }

    return results;
  }

  private async findActiveSeasonalRule(
    tenantId: string,
    serviceType: string,
    date: Date,
  ): Promise<any> {
    const rules = await this.db
      .select()
      .from(seasonalPricingRules)
      .where(
        and(
          eq(seasonalPricingRules.tenantId, tenantId),
          eq(seasonalPricingRules.isActive, true),
          sql`${seasonalPricingRules.startDate} <= ${date}`,
          sql`${seasonalPricingRules.endDate} >= ${date}`,
        ),
      )
      .orderBy(seasonalPricingRules.priority);

    for (const rule of rules) {
      const applicableTypes = rule.applicableServiceTypes as string[];
      if (
        !applicableTypes ||
        applicableTypes.length === 0 ||
        applicableTypes.includes(serviceType)
      ) {
        return rule;
      }
    }

    return null;
  }

  private mapToSeasonalRule(dbRule: any): SeasonalRule {
    return {
      id: dbRule.id,
      ruleName: dbRule.ruleName,
      seasonType: dbRule.seasonType,
      startDate: dbRule.startDate,
      endDate: dbRule.endDate,
      applicableServiceTypes: dbRule.applicableServiceTypes || [],
      adjustmentType: dbRule.adjustmentType,
      adjustmentValue: parseFloat(dbRule.adjustmentValue),
      minimumCharge: dbRule.minimumCharge
        ? parseFloat(dbRule.minimumCharge)
        : undefined,
      maximumCharge: dbRule.maximumCharge
        ? parseFloat(dbRule.maximumCharge)
        : undefined,
      priority: dbRule.priority,
    };
  }

  async getSeasonalPricingReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const rules = await this.db
      .select()
      .from(seasonalPricingRules)
      .where(
        and(
          eq(seasonalPricingRules.tenantId, tenantId),
          sql`${seasonalPricingRules.startDate} <= ${endDate}`,
          sql`${seasonalPricingRules.endDate} >= ${startDate}`,
        ),
      )
      .orderBy(seasonalPricingRules.startDate);

    return {
      period: { startDate, endDate },
      totalRules: rules.length,
      activeRules: rules.filter((r) => r.isActive).length,
      rules: rules.map((r) => this.mapToSeasonalRule(r)),
    };
  }
}

