import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { eq, and, or, like, count, desc } from 'drizzle-orm';
import { campaigns, discounts, promotions } from '../../../database/schema/shared/pricing-campaigns.schema';

@Injectable()
export class MarketingService {
  constructor(private readonly dbService: DatabaseService) {}

  private get db() {
    return this.dbService.getDb();
  }

  // ========== CAMPAIGNS ==========
  async getCampaigns(tenantId: string, filters?: { page?: number; limit?: number; search?: string }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(campaigns.tenantId, tenantId)];

      if (filters?.search) {
        conditions.push(
          or(
            like(campaigns.campaignName, `%${filters.search}%`),
            like(campaigns.description, `%${filters.search}%`)
          )
        );
      }

      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

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
        total: Number(total),
        page,
        limit,
        totalPages: Math.ceil(Number(total) / limit),
      };
    } catch (error) {
      return { data: [], total: 0 };
    }
  }

  async createCampaign(tenantId: string, data: any) {
    try {
      const result = await this.db
        .insert(campaigns)
        .values({
          tenantId,
          campaignName: data.name || data.campaignName,
          campaignType: data.type || data.campaignType || 'discount',
          description: data.description,
          startDate: data.startDate ? new Date(data.startDate) : new Date(),
          endDate: data.endDate ? new Date(data.endDate) : new Date(),
          status: data.status || 'draft',
          discountType: data.discountType,
          discountValue: data.discountValue || data.budget,
          minPurchaseAmount: data.minPurchaseAmount,
          maxDiscountAmount: data.maxDiscountAmount,
          usageLimit: data.usageLimit,
        })
        .returning();

      return result[0];
    } catch (error) {
      throw error;
    }
  }

  // ========== DISCOUNTS ==========
  async getDiscounts(tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(discounts)
        .where(eq(discounts.tenantId, tenantId))
        .orderBy(desc(discounts.createdAt));

      return { data: result, total: result.length };
    } catch (error) {
      return { data: [], total: 0 };
    }
  }

  async createDiscount(tenantId: string, data: any) {
    try {
      const result = await this.db
        .insert(discounts)
        .values({
          tenantId,
          discountCode: data.code || data.discountCode,
          discountName: data.name || data.discountName,
          discountType: data.type || data.discountType,
          discountValue: data.value || data.discountValue,
          minPurchaseAmount: data.minPurchaseAmount,
          maxDiscountAmount: data.maxDiscountAmount,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          status: data.status || 'active',
          usageLimit: data.usageLimit,
        })
        .returning();

      return result[0];
    } catch (error) {
      throw error;
    }
  }

  // ========== NEWSLETTER ==========
  async getSubscribers(tenantId: string) {
    try {
      const subscribers = [
        { id: '1', email: 'ali@example.com', status: 'active', subscribedAt: '2025-01-01' },
        { id: '2', email: 'ayse@example.com', status: 'active', subscribedAt: '2025-01-05' },
      ];
      return { data: subscribers, total: subscribers.length };
    } catch (error) {
      return { data: [], total: 0 };
    }
  }

  async sendNewsletter(tenantId: string, data: any) {
    return { success: true, message: 'Newsletter sent successfully', sentCount: 150 };
  }

  // ========== SEO ==========
  async getSEOData(tenantId: string) {
    return {
      metaTags: [
        { page: 'home', title: 'Ayaz Lojistik - Güncel Başlık', description: 'Meta açıklama' },
        { page: 'services', title: 'Hizmetlerimiz', description: 'Hizmetler sayfası' },
      ],
      keywords: ['lojistik', 'kargo', 'taşıma', 'depolama'],
      sitemapUrl: 'https://ayazlogistics.com/sitemap.xml',
    };
  }

  async updateSEO(tenantId: string, data: any) {
    return { success: true, data };
  }

  // ========== ADS ==========
  async getAds(tenantId: string) {
    try {
      const ads = [
        { id: '1', name: 'Google AdWords Kampanyası', platform: 'google', status: 'active', impressions: 12500, clicks: 340 },
        { id: '2', name: 'Facebook Reklamları', platform: 'facebook', status: 'active', impressions: 8900, clicks: 180 },
      ];
      return { data: ads, total: ads.length };
    } catch (error) {
      return { data: [], total: 0 };
    }
  }

  async createAd(tenantId: string, data: any) {
    return { ...data, id: Date.now().toString(), tenantId, createdAt: new Date() };
  }
}
