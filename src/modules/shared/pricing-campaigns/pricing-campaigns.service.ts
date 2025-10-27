import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { eq, and, desc, count, gte, lte, or } from 'drizzle-orm';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { pricingRules, campaigns, discounts, promotions } from '../../../database/schema/shared/pricing-campaigns.schema';
import { products } from '../../../database/schema/shared/products.schema';
import { invoices } from '../../../database/schema/shared/billing.schema';

@Injectable()
export class PricingCampaignsService {
  constructor(private readonly dbService: DatabaseService) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getPricingRules(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(pricingRules.tenantId, tenantId)];

    if (filters?.type) {
      conditions.push(eq(pricingRules.ruleType, filters.type));
    }

    if (filters?.status) {
      conditions.push(eq(pricingRules.status, filters.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(pricingRules)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(pricingRules.priority), desc(pricingRules.createdAt)),
        this.db
          .select({ count: count() })
          .from(pricingRules)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getPricingRules:', error);
      throw new BadRequestException(`Fiyatlandırma kuralları alınamadı: ${error.message}`);
    }
  }

  async getPricingRuleById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(pricingRules)
        .where(and(eq(pricingRules.id, id), eq(pricingRules.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Fiyatlandırma kuralı bulunamadı');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Fiyatlandırma kuralı bulunamadı');
    }
  }

  async createPricingRule(createPricingRuleDto: CreatePricingRuleDto, tenantId: string, userId: string) {
    try {
      const discountPercent = createPricingRuleDto.discountPercentage 
        ? createPricingRuleDto.discountPercentage.toString()
        : createPricingRuleDto.discountPercent?.toString() || null;
      
      const discountAmount = createPricingRuleDto.fixedDiscountAmount 
        ? createPricingRuleDto.fixedDiscountAmount.toString()
        : createPricingRuleDto.discountAmount?.toString() || null;

      const result = await this.db
        .insert(pricingRules)
        .values({
          ruleName: createPricingRuleDto.name || createPricingRuleDto.ruleName,
          ruleType: createPricingRuleDto.type || createPricingRuleDto.ruleType,
          productId: createPricingRuleDto.productId,
          customerId: createPricingRuleDto.customerId,
          minQuantity: createPricingRuleDto.minQuantity,
          maxQuantity: createPricingRuleDto.maxQuantity,
          discountPercent: discountPercent,
          discountAmount: discountAmount,
          startDate: createPricingRuleDto.startDate ? new Date(createPricingRuleDto.startDate) : null,
          endDate: createPricingRuleDto.endDate ? new Date(createPricingRuleDto.endDate) : null,
          status: 'inactive',
          priority: createPricingRuleDto.priority || 0,
          tenantId,
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in createPricingRule:', error);
      throw new BadRequestException(`Fiyatlandırma kuralı oluşturulamadı: ${error.message}`);
    }
  }

  async updatePricingRule(id: string, updatePricingRuleDto: UpdatePricingRuleDto, tenantId: string) {
    try {
      const result = await this.db
        .update(pricingRules)
        .set({ ...updatePricingRuleDto, updatedAt: new Date() })
        .where(and(eq(pricingRules.id, id), eq(pricingRules.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Fiyatlandırma kuralı bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in updatePricingRule:', error);
      throw error;
    }
  }

  async activatePricingRule(id: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(pricingRules)
        .set({
          status: 'active',
          updatedAt: new Date(),
        })
        .where(and(eq(pricingRules.id, id), eq(pricingRules.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Fiyatlandırma kuralı bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in activatePricingRule:', error);
      throw error;
    }
  }

  async deactivatePricingRule(id: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(pricingRules)
        .set({
          status: 'inactive',
          updatedAt: new Date(),
        })
        .where(and(eq(pricingRules.id, id), eq(pricingRules.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Fiyatlandırma kuralı bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in deactivatePricingRule:', error);
      throw error;
    }
  }

  async calculatePrice(productId: string, quantity: number, customerId: string | undefined, tenantId: string) {
    try {
      const product = await this.db
        .select()
        .from(products)
        .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
        .limit(1);

      if (!product || product.length === 0) {
        throw new NotFoundException('Ürün bulunamadı');
      }

      const basePrice = Number(product[0].unitPrice || 0);
      let finalPrice = basePrice * quantity;
      let discount = 0;

      // Active pricing rules'ları kontrol et
      const activeRules = await this.db
        .select()
        .from(pricingRules)
        .where(
          and(
            eq(pricingRules.tenantId, tenantId),
            eq(pricingRules.status, 'active'),
            or(
              eq(pricingRules.productId, productId),
              eq(pricingRules.productId, null)
            ),
            customerId ? or(eq(pricingRules.customerId, customerId), eq(pricingRules.customerId, null)) : undefined,
            or(
              and(eq(pricingRules.minQuantity, null), eq(pricingRules.maxQuantity, null)),
              and(
                or(eq(pricingRules.minQuantity, null), gte(quantity, Number(pricingRules.minQuantity))),
                or(eq(pricingRules.maxQuantity, null), lte(quantity, Number(pricingRules.maxQuantity)))
              )
            )
          )
        )
        .orderBy(desc(pricingRules.priority));

      if (activeRules.length > 0) {
        const rule = activeRules[0];
        if (rule.discountPercent) {
          discount = finalPrice * (Number(rule.discountPercent) / 100);
        } else if (rule.discountAmount) {
          discount = Number(rule.discountAmount);
        }
        finalPrice = finalPrice - discount;
      }

      return {
        productId,
        quantity,
        basePrice,
        totalBasePrice: basePrice * quantity,
        discount,
        finalPrice,
        discountPercent: discount > 0 ? (discount / (basePrice * quantity)) * 100 : 0,
      };
    } catch (error) {
      console.error('Database error in calculatePrice:', error);
      throw new BadRequestException(`Fiyat hesaplanamadı: ${error.message}`);
    }
  }

  async getCampaigns(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(campaigns.tenantId, tenantId)];

    if (filters?.type) {
      conditions.push(eq(campaigns.campaignType, filters.type));
    }

    if (filters?.status) {
      conditions.push(eq(campaigns.status, filters.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(campaigns)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(campaigns.createdAt)),
        this.db
          .select({ count: count() })
          .from(campaigns)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getCampaigns:', error);
      throw new BadRequestException(`Kampanyalar alınamadı: ${error.message}`);
    }
  }

  async getCampaignById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Kampanya bulunamadı');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Kampanya bulunamadı');
    }
  }

  async createCampaign(createCampaignDto: CreateCampaignDto, tenantId: string, userId: string) {
    try {
      const discountType = createCampaignDto.discountPercentage 
        ? 'percentage' 
        : createCampaignDto.fixedDiscountAmount 
          ? 'fixed' 
          : null;
      
      const discountValue = createCampaignDto.discountPercentage 
        ? createCampaignDto.discountPercentage.toString()
        : createCampaignDto.fixedDiscountAmount?.toString();

      const result = await this.db
        .insert(campaigns)
        .values({
          campaignName: createCampaignDto.name || createCampaignDto.campaignName,
          campaignType: createCampaignDto.type || createCampaignDto.campaignType,
          description: createCampaignDto.description,
          startDate: new Date(createCampaignDto.startDate),
          endDate: new Date(createCampaignDto.endDate),
          status: createCampaignDto.status || 'draft',
          discountType: discountType,
          discountValue: discountValue,
          minPurchaseAmount: createCampaignDto.minOrderAmount?.toString() || createCampaignDto.minPurchaseAmount?.toString(),
          maxDiscountAmount: createCampaignDto.maxDiscountAmount?.toString(),
          targetProducts: createCampaignDto.productIds ? { productIds: createCampaignDto.productIds } : createCampaignDto.targetProducts,
          targetCustomers: createCampaignDto.customerIds ? { customerIds: createCampaignDto.customerIds } : createCampaignDto.targetCustomers,
          usageLimit: createCampaignDto.usageLimit,
          createdBy: userId,
          tenantId,
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in createCampaign:', error);
      throw new BadRequestException(`Kampanya oluşturulamadı: ${error.message}`);
    }
  }

  async updateCampaign(id: string, updateCampaignDto: UpdateCampaignDto, tenantId: string) {
    try {
      const result = await this.db
        .update(campaigns)
        .set({ ...updateCampaignDto, updatedAt: new Date() })
        .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Kampanya bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in updateCampaign:', error);
      throw error;
    }
  }

  async activateCampaign(id: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(campaigns)
        .set({
          status: 'active',
          updatedAt: new Date(),
        })
        .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Kampanya bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in activateCampaign:', error);
      throw error;
    }
  }

  async deactivateCampaign(id: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(campaigns)
        .set({
          status: 'paused',
          updatedAt: new Date(),
        })
        .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Kampanya bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in deactivateCampaign:', error);
      throw error;
    }
  }

  async getCampaignPerformance(id: string, tenantId: string) {
    try {
      const campaign = await this.getCampaignById(id, tenantId);
      
      return {
        campaign,
        usageCount: campaign.usedCount || 0,
        usageLimit: campaign.usageLimit,
        usageRate: campaign.usageLimit ? ((campaign.usedCount || 0) / campaign.usageLimit) * 100 : 0,
        status: campaign.status,
      };
    } catch (error) {
      console.error('Database error in getCampaignPerformance:', error);
      throw error;
    }
  }

  async getDiscounts(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(discounts.tenantId, tenantId)];

    if (filters?.type) {
      conditions.push(eq(discounts.discountType, filters.type));
    }

    if (filters?.status) {
      conditions.push(eq(discounts.status, filters.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(discounts)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(discounts.createdAt)),
        this.db
          .select({ count: count() })
          .from(discounts)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getDiscounts:', error);
      throw new BadRequestException(`İndirimler alınamadı: ${error.message}`);
    }
  }

  async getDiscountById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(discounts)
        .where(and(eq(discounts.id, id), eq(discounts.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('İndirim bulunamadı');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('İndirim bulunamadı');
    }
  }

  async createDiscount(discountData: any, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .insert(discounts)
        .values({
          discountCode: discountData.discountCode || `DISC-${Date.now()}`,
          discountName: discountData.discountName,
          discountType: discountData.discountType,
          discountValue: discountData.discountValue?.toString(),
          minPurchaseAmount: discountData.minPurchaseAmount?.toString(),
          maxDiscountAmount: discountData.maxDiscountAmount?.toString(),
          startDate: discountData.startDate ? new Date(discountData.startDate) : null,
          endDate: discountData.endDate ? new Date(discountData.endDate) : null,
          status: 'active',
          usageLimit: discountData.usageLimit,
          applicableProducts: discountData.applicableProducts,
          tenantId,
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in createDiscount:', error);
      throw new BadRequestException(`İndirim oluşturulamadı: ${error.message}`);
    }
  }

  async updateDiscount(id: string, discountData: any, tenantId: string) {
    try {
      const result = await this.db
        .update(discounts)
        .set({ ...discountData, updatedAt: new Date() })
        .where(and(eq(discounts.id, id), eq(discounts.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('İndirim bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in updateDiscount:', error);
      throw error;
    }
  }

  async getPromotions(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(promotions.tenantId, tenantId)];

    if (filters?.type) {
      conditions.push(eq(promotions.promotionType, filters.type));
    }

    if (filters?.status) {
      conditions.push(eq(promotions.status, filters.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(promotions)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(promotions.createdAt)),
        this.db
          .select({ count: count() })
          .from(promotions)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getPromotions:', error);
      throw new BadRequestException(`Promosyonlar alınamadı: ${error.message}`);
    }
  }

  async getPromotionById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(promotions)
        .where(and(eq(promotions.id, id), eq(promotions.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Promosyon bulunamadı');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Promosyon bulunamadı');
    }
  }

  async createPromotion(promotionData: any, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .insert(promotions)
        .values({
          promotionName: promotionData.promotionName,
          promotionType: promotionData.promotionType,
          description: promotionData.description,
          startDate: new Date(promotionData.startDate),
          endDate: new Date(promotionData.endDate),
          status: 'draft',
          buyQuantity: promotionData.buyQuantity,
          getQuantity: promotionData.getQuantity,
          discountPercent: promotionData.discountPercent?.toString(),
          applicableProducts: promotionData.applicableProducts,
          targetCustomers: promotionData.targetCustomers,
          usageLimit: promotionData.usageLimit,
          createdBy: userId,
          tenantId,
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in createPromotion:', error);
      throw new BadRequestException(`Promosyon oluşturulamadı: ${error.message}`);
    }
  }

  async updatePromotion(id: string, promotionData: any, tenantId: string) {
    try {
      const result = await this.db
        .update(promotions)
        .set({ ...promotionData, updatedAt: new Date() })
        .where(and(eq(promotions.id, id), eq(promotions.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Promosyon bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in updatePromotion:', error);
      throw error;
    }
  }

  async getPricingPerformanceAnalytics(tenantId: string, dateFrom: string, dateTo: string) {
    try {
      const [activeRules, appliedRules] = await Promise.all([
        this.db.select({ count: count() }).from(pricingRules).where(
          and(
            eq(pricingRules.tenantId, tenantId),
            eq(pricingRules.status, 'active')
          )
        ),
        this.db.select().from(invoices).where(
          and(
            eq(invoices.tenantId, tenantId),
            gte(invoices.invoiceDate, new Date(dateFrom)),
            lte(invoices.invoiceDate, new Date(dateTo))
          )
        ),
      ]);

      return {
        period: { from: dateFrom, to: dateTo },
        activeRules: Number(activeRules[0].count),
        totalSales: appliedRules.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0),
        totalInvoices: appliedRules.length,
      };
    } catch (error) {
      console.error('Database error in getPricingPerformanceAnalytics:', error);
      throw new BadRequestException(`Fiyatlandırma performans analizi alınamadı: ${error.message}`);
    }
  }

  async getCampaignPerformanceAnalytics(tenantId: string, dateFrom: string, dateTo: string) {
    try {
      const activeCampaigns = await this.db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.tenantId, tenantId),
            eq(campaigns.status, 'active'),
            gte(campaigns.startDate, new Date(dateFrom)),
            lte(campaigns.endDate, new Date(dateTo))
          )
        );

      return {
        period: { from: dateFrom, to: dateTo },
        activeCampaigns: activeCampaigns.length,
        totalUsage: activeCampaigns.reduce((sum, camp) => sum + (camp.usedCount || 0), 0),
        campaigns: activeCampaigns,
      };
    } catch (error) {
      console.error('Database error in getCampaignPerformanceAnalytics:', error);
      throw new BadRequestException(`Kampanya performans analizi alınamadı: ${error.message}`);
    }
  }

  async getRevenueImpactAnalysis(tenantId: string, dateFrom: string, dateTo: string) {
    try {
      const [revenueWithDiscounts, totalRevenue] = await Promise.all([
        this.db.select().from(invoices).where(
          and(
            eq(invoices.tenantId, tenantId),
            gte(invoices.invoiceDate, new Date(dateFrom)),
            lte(invoices.invoiceDate, new Date(dateTo)),
            eq(invoices.status, 'paid')
          )
        ),
        this.db.select().from(invoices).where(
          and(
            eq(invoices.tenantId, tenantId),
            gte(invoices.invoiceDate, new Date(dateFrom)),
            lte(invoices.invoiceDate, new Date(dateTo))
          )
        ),
      ]);

      const total = totalRevenue.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
      const withDiscounts = revenueWithDiscounts.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

      return {
        period: { from: dateFrom, to: dateTo },
        totalRevenue: total,
        revenueWithDiscounts: withDiscounts,
        discountImpact: total - withDiscounts,
        impactPercent: total > 0 ? ((total - withDiscounts) / total) * 100 : 0,
      };
    } catch (error) {
      console.error('Database error in getRevenueImpactAnalysis:', error);
      throw new BadRequestException(`Gelir etkisi analizi alınamadı: ${error.message}`);
    }
  }

  async getPricingSummaryReport(tenantId: string, dateFrom: string, dateTo: string) {
    try {
      const [rules, campaignsList, discountsList] = await Promise.all([
        this.getPricingRules(tenantId, {}),
        this.getCampaigns(tenantId, {}),
        this.getDiscounts(tenantId, {}),
      ]);

      return {
        period: { from: dateFrom, to: dateTo },
        pricingRules: {
          total: rules.meta.total,
          active: rules.data.filter((r: any) => r.status === 'active').length,
        },
        campaigns: {
          total: campaignsList.meta.total,
          active: campaignsList.data.filter((c: any) => c.status === 'active').length,
        },
        discounts: {
          total: discountsList.meta.total,
          active: discountsList.data.filter((d: any) => d.status === 'active').length,
        },
      };
    } catch (error) {
      console.error('Database error in getPricingSummaryReport:', error);
      throw new BadRequestException(`Fiyatlandırma özet raporu alınamadı: ${error.message}`);
    }
  }

  async getCampaignSummaryReport(tenantId: string, dateFrom: string, dateTo: string) {
    try {
      const campaignsList = await this.db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.tenantId, tenantId),
            gte(campaigns.startDate, new Date(dateFrom)),
            lte(campaigns.endDate, new Date(dateTo))
          )
        );

      return {
        period: { from: dateFrom, to: dateTo },
        totalCampaigns: campaignsList.length,
        activeCampaigns: campaignsList.filter(c => c.status === 'active').length,
        totalUsage: campaignsList.reduce((sum, c) => sum + (c.usedCount || 0), 0),
        campaigns: campaignsList,
      };
    } catch (error) {
      console.error('Database error in getCampaignSummaryReport:', error);
      throw new BadRequestException(`Kampanya özet raporu alınamadı: ${error.message}`);
    }
  }

  async exportPricingReport(exportRequest: any, tenantId: string) {
    try {
      const reportType = exportRequest.type || 'summary';

      if (reportType === 'pricing-performance') {
        return await this.getPricingPerformanceAnalytics(
          tenantId,
          exportRequest.dateFrom,
          exportRequest.dateTo
        );
      } else if (reportType === 'campaign-performance') {
        return await this.getCampaignPerformanceAnalytics(
          tenantId,
          exportRequest.dateFrom,
          exportRequest.dateTo
        );
      } else if (reportType === 'revenue-impact') {
        return await this.getRevenueImpactAnalysis(
          tenantId,
          exportRequest.dateFrom,
          exportRequest.dateTo
        );
      } else if (reportType === 'summary') {
        return await this.getPricingSummaryReport(
          tenantId,
          exportRequest.dateFrom,
          exportRequest.dateTo
        );
      }

      throw new BadRequestException('Geçersiz rapor tipi');
    } catch (error) {
      console.error('Database error in exportPricingReport:', error);
      throw error;
    }
  }
}
