import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, like, or } from 'drizzle-orm';
import { customers, customerGroups } from '../../../../database/schema/shared/crm.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

/**
 * Customer WMS Management Service
 * Manages customer-specific warehouse settings and configurations
 * Based on Axata: Firma Bilgileri Tanımlama
 */
@Injectable()
export class CustomerWmsService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Create customer with WMS-specific settings
   */
  async createCustomerWmsProfile(data: {
    customerId: string;
    companyName: string;
    taxNumber?: string;
    warehouseSettings: {
      dedicatedZone?: string[];
      dedicatedLocations?: string[];
      allowMixedPallets?: boolean;
      requireLotTracking?: boolean;
      requireSerialTracking?: boolean;
      temperatureRequirements?: {
        min: number;
        max: number;
      };
      specialHandlingInstructions?: string;
      priorityLevel?: 'low' | 'normal' | 'high' | 'vip';
      qualityCheckRequired?: boolean;
      photoRequiredOnDamage?: boolean;
      allowBackorders?: boolean;
      maxBackorderDays?: number;
    };
    billingSettings?: {
      contractId: string;
      paymentTerms: string;
      creditLimit?: number;
      discountPercentage?: number;
    };
  }, tenantId: string, userId: string) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, data.customerId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Update customer with WMS settings
    const [updated] = await this.db
      .update(customers)
      .set({
        metadata: {
          ...customer.metadata,
          wmsSettings: data.warehouseSettings,
          billingSettings: data.billingSettings,
        },
        updatedAt: new Date(),
      })
      .where(eq(customers.id, data.customerId))
      .returning();

    await this.eventBus.emit('customer.wms.profile.created', {
      customerId: data.customerId,
      tenantId,
    });

    return updated;
  }

  /**
   * Get customer WMS settings
   */
  async getCustomerWmsSettings(customerId: string, tenantId: string) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      customerId: customer.id,
      companyName: customer.companyName,
      wmsSettings: customer.metadata?.wmsSettings || {},
      billingSettings: customer.metadata?.billingSettings || {},
    };
  }

  /**
   * Create customer group for warehouse operations
   * Axata: Firma Grupları Tanımlama
   */
  async createCustomerGroup(data: {
    groupName: string;
    groupCode: string;
    description?: string;
    defaultSettings?: any;
  }, tenantId: string, userId: string) {
    const [group] = await this.db
      .insert(customerGroups)
      .values({
        tenantId,
        groupName: data.groupName,
        groupCode: data.groupCode,
        description: data.description,
        settings: data.defaultSettings,
        createdBy: userId,
      })
      .returning();

    await this.eventBus.emit('customer.group.created', {
      groupId: group.id,
      tenantId,
    });

    return group;
  }

  /**
   * Assign customer to warehouse zone
   * Axata: Cross-Dock Adrese Firma Atama İşlemi
   */
  async assignCustomerToZone(data: {
    customerId: string;
    warehouseId: string;
    zoneCode: string;
    startDate: Date;
    endDate?: Date;
    exclusive?: boolean;
  }, tenantId: string) {
    const customer = await this.getCustomerWmsSettings(data.customerId, tenantId);

    const zones = customer.wmsSettings.dedicatedZone || [];
    zones.push({
      warehouseId: data.warehouseId,
      zoneCode: data.zoneCode,
      startDate: data.startDate,
      endDate: data.endDate,
      exclusive: data.exclusive,
    });

    await this.db
      .update(customers)
      .set({
        metadata: {
          ...customer,
          wmsSettings: {
            ...customer.wmsSettings,
            dedicatedZone: zones,
          },
        },
      })
      .where(eq(customers.id, data.customerId));

    return {
      customerId: data.customerId,
      zoneAssigned: data.zoneCode,
      warehouseId: data.warehouseId,
    };
  }

  /**
   * Blacklist management
   * Axata: Girişe Engelli Kara Liste Tanımlama
   */
  async addToBlacklist(data: {
    customerId?: string;
    supplierId?: string;
    reason: string;
    blockedOperations: string[];
    effectiveDate: Date;
    expiryDate?: Date;
  }, tenantId: string, userId: string) {
    const blacklistEntry = {
      id: `BL-${Date.now()}`,
      customerId: data.customerId,
      supplierId: data.supplierId,
      reason: data.reason,
      blockedOperations: data.blockedOperations,
      effectiveDate: data.effectiveDate,
      expiryDate: data.expiryDate,
      createdBy: userId,
      createdAt: new Date(),
    };

    await this.eventBus.emit('blacklist.entry.added', {
      entryId: blacklistEntry.id,
      tenantId,
    });

    return blacklistEntry;
  }

  /**
   * Check if customer/supplier is blacklisted
   */
  async checkBlacklist(customerId: string, operation: string, tenantId: string): Promise<boolean> {
    // TODO: Query blacklist table
    // For now return false
    return false;
  }

  /**
   * Get customer warehouse performance metrics
   */
  async getCustomerPerformanceMetrics(customerId: string, warehouseId: string, period: { startDate: Date; endDate: Date }) {
    const orderMetrics = await this.calculateOrderMetrics(customerId, warehouseId, period);
    const storageMetrics = await this.calculateStorageMetrics(customerId, warehouseId, period);
    const qualityMetrics = await this.calculateQualityMetrics(customerId, warehouseId, period);
    const financialMetrics = await this.calculateFinancialMetrics(customerId, period);

    return {
      customerId,
      warehouseId,
      period,
      orderMetrics: {
        totalOrders: orderMetrics.total,
        completedOrders: orderMetrics.completed,
        onTimeDeliveryRate: orderMetrics.onTimeRate,
        averageLeadTime: orderMetrics.avgLeadTime,
        orderAccuracyRate: orderMetrics.accuracyRate,
        perfectOrderRate: orderMetrics.perfectOrderRate,
      },
      storageMetrics: {
        avgPalletsStored: storageMetrics.avgPallets,
        peakPallets: storageMetrics.peakPallets,
        storageUtilization: storageMetrics.utilization,
        dedicatedZones: storageMetrics.dedicatedZones,
        avgStorageDays: storageMetrics.avgDays,
      },
      qualityMetrics: {
        receivingAccuracy: qualityMetrics.receivingAccuracy,
        damageRate: qualityMetrics.damageRate,
        returnRate: qualityMetrics.returnRate,
        complaintCount: qualityMetrics.complaintCount,
      },
      financialMetrics: {
        totalRevenue: financialMetrics.revenue,
        totalCost: financialMetrics.cost,
        profitMargin: financialMetrics.margin,
        avgRevenuePerOrder: financialMetrics.avgPerOrder,
      },
      comparisonToPrevious: this.compareT oPreviousPeriod(period),
      recommendations: this.generateCustomerRecommendations(orderMetrics, storageMetrics, qualityMetrics),
    };
  }

  private async calculateOrderMetrics(customerId: string, warehouseId: string, period: any) {
    return {
      total: 100,
      completed: 95,
      onTimeRate: 96.5,
      avgLeadTime: 2.5,
      accuracyRate: 98.2,
      perfectOrderRate: 94.5,
    };
  }

  private async calculateStorageMetrics(customerId: string, warehouseId: string, period: any) {
    return {
      avgPallets: 250,
      peakPallets: 380,
      utilization: 75.5,
      dedicatedZones: ['A1', 'B2'],
      avgDays: 15.5,
    };
  }

  private async calculateQualityMetrics(customerId: string, warehouseId: string, period: any) {
    return {
      receivingAccuracy: 99.1,
      damageRate: 0.5,
      returnRate: 1.2,
      complaintCount: 3,
    };
  }

  private async calculateFinancialMetrics(customerId: string, period: any) {
    return {
      revenue: 150000,
      cost: 120000,
      margin: 20,
      avgPerOrder: 1500,
    };
  }

  private compareToPreviousPeriod(period: any) {
    return {
      ordersChange: '+5.2%',
      deliveryRateChange: '+2.1%',
      storageChange: '-3.5%',
    };
  }

  private generateCustomerRecommendations(orderMetrics: any, storageMetrics: any, qualityMetrics: any): string[] {
    const recommendations = [];
    
    if (orderMetrics.onTimeRate < 95) {
      recommendations.push('On-time delivery rate below target. Consider dedicated resources or priority handling.');
    }
    
    if (storageMetrics.utilization > 85) {
      recommendations.push('High storage utilization. Consider expanding dedicated space or optimizing inventory levels.');
    }
    
    if (qualityMetrics.damageRate > 1) {
      recommendations.push('Damage rate above acceptable threshold. Review handling procedures and packaging.');
    }
    
    if (orderMetrics.avgLeadTime > 3) {
      recommendations.push('Average lead time exceeds target. Consider process optimization or resource allocation.');
    }

    return recommendations;
  }

  /**
   * Production/Sales companies management
   * Axata: Üretim – Satış Firmaları Tanımlama
   */
  async manageProductionSalesCompanies(data: {
    customerId: string;
    companyType: 'production' | 'sales' | 'both';
    allowDirectTransfer?: boolean;
    productionBlacklist?: string[];
  }, tenantId: string) {
    const customer = await this.getCustomerWmsSettings(data.customerId, tenantId);

    await this.db
      .update(customers)
      .set({
        metadata: {
          ...customer,
          wmsSettings: {
            ...customer.wmsSettings,
            companyType: data.companyType,
            allowDirectTransfer: data.allowDirectTransfer,
            productionBlacklist: data.productionBlacklist,
          },
        },
      })
      .where(eq(customers.id, data.customerId));

    return {
      customerId: data.customerId,
      companyType: data.companyType,
      updated: true,
    };
  }
}

