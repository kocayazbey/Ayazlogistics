import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../core/events/event-bus.service';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { inventory, products, stockMovements } from '../../../database/schema/shared/wms.schema';

interface InventoryAnalysis {
  productId: string;
  sku: string;
  productName: string;
  currentStock: number;
  abcCategory: 'A' | 'B' | 'C';
  xyzCategory: 'X' | 'Y' | 'Z';
  demandVariability: number;
  leadTime: number;
  safetyStock: number;
  reorderPoint: number;
  economicOrderQuantity: number;
  stockoutRisk: number;
  carryingCost: number;
  stockoutCost: number;
  recommendations: string[];
}

interface DemandForecast {
  productId: string;
  forecastPeriod: number; // gün
  forecastedDemand: number;
  confidenceLevel: number;
  seasonalFactors: number[];
  trendDirection: 'increasing' | 'decreasing' | 'stable';
}

interface ReorderRecommendation {
  productId: string;
  currentStock: number;
  reorderPoint: number;
  recommendedQuantity: number;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  expectedStockoutDate: Date;
  costImpact: number;
}

@Injectable()
export class IntelligentInventoryService {
  private readonly logger = new Logger(IntelligentInventoryService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * ABC/XYZ Analizi - Envanter sınıflandırması
   */
  async performABCXYZAnalysis(
    warehouseId: string,
    tenantId: string,
    analysisPeriod: number = 90, // gün
  ): Promise<InventoryAnalysis[]> {
    this.logger.log(`Performing ABC/XYZ analysis for warehouse ${warehouseId}`);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - analysisPeriod * 24 * 60 * 60 * 1000);

    // Ürün bazında satış verilerini al
    const salesData = await this.db
      .select({
        productId: stockMovements.productId,
        totalQuantity: sql<number>`SUM(CASE WHEN ${stockMovements.movementType} = 'outbound' THEN ${stockMovements.quantity} ELSE 0 END)`,
        totalValue: sql<number>`SUM(CASE WHEN ${stockMovements.movementType} = 'outbound' THEN ${stockMovements.quantity} * ${stockMovements.unitCost} ELSE 0 END)`,
        movementCount: sql<number>`COUNT(*)`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.warehouseId, warehouseId),
          eq(stockMovements.tenantId, tenantId),
          gte(stockMovements.createdAt, startDate),
          lte(stockMovements.createdAt, endDate),
        ),
      )
      .groupBy(stockMovements.productId);

    // ABC Analizi - Değer bazında sıralama
    const sortedByValue = salesData.sort((a, b) => b.totalValue - a.totalValue);
    const totalValue = sortedByValue.reduce((sum, item) => sum + item.totalValue, 0);

    // XYZ Analizi - Talep değişkenliği
    const demandVariability = await this.calculateDemandVariability(salesData, startDate, endDate);

    const analyses: InventoryAnalysis[] = [];

    for (let i = 0; i < sortedByValue.length; i++) {
      const item = sortedByValue[i];
      const cumulativeValue = sortedByValue.slice(0, i + 1).reduce((sum, itm) => sum + itm.totalValue, 0);
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;

      // ABC Kategorisi
      let abcCategory: 'A' | 'B' | 'C';
      if (cumulativePercentage <= 80) {
        abcCategory = 'A';
      } else if (cumulativePercentage <= 95) {
        abcCategory = 'B';
      } else {
        abcCategory = 'C';
      }

      // XYZ Kategorisi - Talep değişkenliği
      const variability = demandVariability.get(item.productId) || 0;
      let xyzCategory: 'X' | 'Y' | 'Z';
      if (variability <= 0.2) {
        xyzCategory = 'X'; // Düşük değişkenlik
      } else if (variability <= 0.5) {
        xyzCategory = 'Y'; // Orta değişkenlik
      } else {
        xyzCategory = 'Z'; // Yüksek değişkenlik
      }

      // Güvenlik stoğu hesaplama
      const safetyStock = await this.calculateSafetyStock(item.productId, warehouseId, tenantId);
      
      // Yeniden sipariş noktası
      const reorderPoint = await this.calculateReorderPoint(item.productId, warehouseId, tenantId);
      
      // Ekonomik sipariş miktarı
      const eoq = await this.calculateEOQ(item.productId, warehouseId, tenantId);

      // Stok tükenme riski
      const stockoutRisk = await this.calculateStockoutRisk(item.productId, warehouseId, tenantId);

      // Öneriler
      const recommendations = this.generateRecommendations(abcCategory, xyzCategory, stockoutRisk);

      analyses.push({
        productId: item.productId,
        sku: '', // Ürün detaylarından alınacak
        productName: '',
        currentStock: 0, // Mevcut stok miktarı
        abcCategory,
        xyzCategory,
        demandVariability: variability,
        leadTime: 0, // Tedarik süresi
        safetyStock,
        reorderPoint,
        economicOrderQuantity: eoq,
        stockoutRisk,
        carryingCost: 0, // Taşıma maliyeti
        stockoutCost: 0, // Stok tükenme maliyeti
        recommendations,
      });
    }

    await this.eventBus.emit('inventory.abc_xyz_analysis_completed', {
      warehouseId,
      tenantId,
      analysisPeriod,
      totalProducts: analyses.length,
    });

    return analyses;
  }

  /**
   * Otomatik Yeniden Sipariş Önerileri
   */
  async generateReorderRecommendations(
    warehouseId: string,
    tenantId: string,
  ): Promise<ReorderRecommendation[]> {
    this.logger.log(`Generating reorder recommendations for warehouse ${warehouseId}`);

    const recommendations: ReorderRecommendation[] = [];
    
    // Düşük stok seviyesindeki ürünleri bul
    const lowStockProducts = await this.db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.warehouseId, warehouseId),
          eq(inventory.tenantId, tenantId),
          sql`${inventory.availableQuantity} <= ${inventory.reorderPoint}`,
        ),
      );

    for (const product of lowStockProducts) {
      const reorderPoint = product.reorderPoint || 0;
      const currentStock = product.availableQuantity || 0;
      const recommendedQuantity = await this.calculateOptimalReorderQuantity(
        product.productId,
        warehouseId,
        tenantId,
      );

      // Stok tükenme tarihi tahmini
      const dailyDemand = await this.calculateDailyDemand(product.productId, warehouseId, tenantId);
      const daysUntilStockout = dailyDemand > 0 ? Math.floor(currentStock / dailyDemand) : 0;
      const expectedStockoutDate = new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000);

      // Aciliyet seviyesi
      let urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
      if (daysUntilStockout <= 1) {
        urgencyLevel = 'critical';
      } else if (daysUntilStockout <= 3) {
        urgencyLevel = 'high';
      } else if (daysUntilStockout <= 7) {
        urgencyLevel = 'medium';
      } else {
        urgencyLevel = 'low';
      }

      // Maliyet etkisi
      const costImpact = await this.calculateStockoutCostImpact(
        product.productId,
        warehouseId,
        tenantId,
        daysUntilStockout,
      );

      recommendations.push({
        productId: product.productId,
        currentStock,
        reorderPoint,
        recommendedQuantity,
        urgencyLevel,
        expectedStockoutDate,
        costImpact,
      });
    }

    // Aciliyet seviyesine göre sırala
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel]);

    await this.eventBus.emit('inventory.reorder_recommendations_generated', {
      warehouseId,
      tenantId,
      recommendationsCount: recommendations.length,
      criticalCount: recommendations.filter(r => r.urgencyLevel === 'critical').length,
    });

    return recommendations;
  }

  /**
   * Talep Tahmini
   */
  async generateDemandForecast(
    productId: string,
    warehouseId: string,
    tenantId: string,
    forecastDays: number = 30,
  ): Promise<DemandForecast> {
    const historicalData = await this.getHistoricalDemandData(productId, warehouseId, tenantId, 90);
    
    // Basit hareketli ortalama yöntemi
    const averageDemand = historicalData.reduce((sum, data) => sum + data.dailyDemand, 0) / historicalData.length;
    const forecastedDemand = averageDemand * forecastDays;

    // Mevsimsel faktörler
    const seasonalFactors = await this.calculateSeasonalFactors(historicalData);
    
    // Trend analizi
    const trendDirection = this.analyzeTrend(historicalData);

    // Güven seviyesi hesaplama
    const confidenceLevel = this.calculateConfidenceLevel(historicalData);

    return {
      productId,
      forecastPeriod: forecastDays,
      forecastedDemand,
      confidenceLevel,
      seasonalFactors,
      trendDirection,
    };
  }

  /**
   * Stok Optimizasyonu
   */
  async optimizeInventoryLevels(
    warehouseId: string,
    tenantId: string,
  ): Promise<{
    totalSavings: number;
    recommendations: Array<{
      productId: string;
      currentLevel: number;
      recommendedLevel: number;
      potentialSavings: number;
      action: 'increase' | 'decrease' | 'maintain';
    }>;
  }> {
    const analyses = await this.performABCXYZAnalysis(warehouseId, tenantId);
    const recommendations: any[] = [];
    let totalSavings = 0;

    for (const analysis of analyses) {
      let action: 'increase' | 'decrease' | 'maintain';
      let recommendedLevel = analysis.currentStock;
      let potentialSavings = 0;

      // ABC/XYZ kombinasyonuna göre strateji
      if (analysis.abcCategory === 'A' && analysis.xyzCategory === 'X') {
        // Yüksek değer, düşük değişkenlik - Sıkı kontrol
        recommendedLevel = analysis.reorderPoint + analysis.safetyStock;
        action = 'maintain';
      } else if (analysis.abcCategory === 'A' && analysis.xyzCategory === 'Z') {
        // Yüksek değer, yüksek değişkenlik - Güvenlik stoğu artır
        recommendedLevel = analysis.currentStock * 1.2;
        action = 'increase';
      } else if (analysis.abcCategory === 'C' && analysis.xyzCategory === 'X') {
        // Düşük değer, düşük değişkenlik - Stok azalt
        recommendedLevel = analysis.currentStock * 0.8;
        action = 'decrease';
        potentialSavings = (analysis.currentStock - recommendedLevel) * analysis.carryingCost;
      }

      if (action !== 'maintain') {
        recommendations.push({
          productId: analysis.productId,
          currentLevel: analysis.currentStock,
          recommendedLevel,
          potentialSavings,
          action,
        });
        totalSavings += potentialSavings;
      }
    }

    return {
      totalSavings,
      recommendations,
    };
  }

  // Yardımcı metodlar
  private async calculateDemandVariability(
    salesData: any[],
    startDate: Date,
    endDate: Date,
  ): Promise<Map<string, number>> {
    const variabilityMap = new Map<string, number>();
    
    for (const item of salesData) {
      // Günlük talep verilerini al
      const dailyDemands = await this.getDailyDemandData(item.productId, startDate, endDate);
      
      if (dailyDemands.length > 0) {
        const mean = dailyDemands.reduce((sum, d) => sum + d, 0) / dailyDemands.length;
        const variance = dailyDemands.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / dailyDemands.length;
        const coefficientOfVariation = Math.sqrt(variance) / mean;
        variabilityMap.set(item.productId, coefficientOfVariation);
      }
    }
    
    return variabilityMap;
  }

  private async calculateSafetyStock(
    productId: string,
    warehouseId: string,
    tenantId: string,
  ): Promise<number> {
    // Güvenlik stoğu = Z * √(LT) * σd
    // Z: Güven seviyesi faktörü (1.65 = %95)
    // LT: Lead time
    // σd: Talep standart sapması
    
    const leadTime = await this.getLeadTime(productId, warehouseId, tenantId);
    const demandStdDev = await this.getDemandStandardDeviation(productId, warehouseId, tenantId);
    const zScore = 1.65; // %95 güven seviyesi
    
    return Math.ceil(zScore * Math.sqrt(leadTime) * demandStdDev);
  }

  private async calculateReorderPoint(
    productId: string,
    warehouseId: string,
    tenantId: string,
  ): Promise<number> {
    const leadTime = await this.getLeadTime(productId, warehouseId, tenantId);
    const averageDemand = await this.getAverageDemand(productId, warehouseId, tenantId);
    const safetyStock = await this.calculateSafetyStock(productId, warehouseId, tenantId);
    
    return Math.ceil(leadTime * averageDemand + safetyStock);
  }

  private async calculateEOQ(
    productId: string,
    warehouseId: string,
    tenantId: string,
  ): Promise<number> {
    // EOQ = √(2 * D * S / H)
    // D: Yıllık talep
    // S: Sipariş maliyeti
    // H: Taşıma maliyeti
    
    const annualDemand = await this.getAnnualDemand(productId, warehouseId, tenantId);
    const orderingCost = await this.getOrderingCost(productId, warehouseId, tenantId);
    const holdingCost = await this.getHoldingCost(productId, warehouseId, tenantId);
    
    return Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / holdingCost));
  }

  private async calculateStockoutRisk(
    productId: string,
    warehouseId: string,
    tenantId: string,
  ): Promise<number> {
    const currentStock = await this.getCurrentStock(productId, warehouseId, tenantId);
    const reorderPoint = await this.calculateReorderPoint(productId, warehouseId, tenantId);
    const leadTime = await this.getLeadTime(productId, warehouseId, tenantId);
    
    if (currentStock <= reorderPoint) {
      return 1.0; // %100 stok tükenme riski
    }
    
    // Stok tükenme olasılığı hesaplama
    const daysUntilReorder = Math.ceil((currentStock - reorderPoint) / await this.getAverageDemand(productId, warehouseId, tenantId));
    return Math.max(0, Math.min(1, (leadTime - daysUntilReorder) / leadTime));
  }

  private generateRecommendations(
    abcCategory: string,
    xyzCategory: string,
    stockoutRisk: number,
  ): string[] {
    const recommendations: string[] = [];
    
    if (abcCategory === 'A') {
      recommendations.push('Yüksek değerli ürün - Sıkı stok kontrolü gerekli');
      if (stockoutRisk > 0.3) {
        recommendations.push('Stok tükenme riski yüksek - Acil sipariş gerekli');
      }
    }
    
    if (xyzCategory === 'Z') {
      recommendations.push('Yüksek talep değişkenliği - Güvenlik stoğu artırılmalı');
    }
    
    if (abcCategory === 'C' && xyzCategory === 'X') {
      recommendations.push('Düşük değer, düşük değişkenlik - Stok seviyesi azaltılabilir');
    }
    
    return recommendations;
  }

  // Veri erişim metodları
  private async getHistoricalDemandData(productId: string, warehouseId: string, tenantId: string, days: number) {
    // Tarihsel talep verilerini getir
    return [];
  }

  private async getDailyDemandData(productId: string, startDate: Date, endDate: Date) {
    // Günlük talep verilerini getir
    return [];
  }

  private async getLeadTime(productId: string, warehouseId: string, tenantId: string): Promise<number> {
    // Tedarik süresini getir
    return 7; // varsayılan 7 gün
  }

  private async getDemandStandardDeviation(productId: string, warehouseId: string, tenantId: string): Promise<number> {
    // Talep standart sapmasını hesapla
    return 10; // varsayılan değer
  }

  private async getAverageDemand(productId: string, warehouseId: string, tenantId: string): Promise<number> {
    // Ortalama günlük talep
    return 5; // varsayılan değer
  }

  private async getAnnualDemand(productId: string, warehouseId: string, tenantId: string): Promise<number> {
    // Yıllık talep
    return 1825; // varsayılan değer
  }

  private async getOrderingCost(productId: string, warehouseId: string, tenantId: string): Promise<number> {
    // Sipariş maliyeti
    return 50; // varsayılan değer
  }

  private async getHoldingCost(productId: string, warehouseId: string, tenantId: string): Promise<number> {
    // Taşıma maliyeti
    return 2; // varsayılan değer
  }

  private async getCurrentStock(productId: string, warehouseId: string, tenantId: string): Promise<number> {
    // Mevcut stok miktarı
    return 100; // varsayılan değer
  }

  private async calculateOptimalReorderQuantity(
    productId: string,
    warehouseId: string,
    tenantId: string,
  ): Promise<number> {
    const eoq = await this.calculateEOQ(productId, warehouseId, tenantId);
    const reorderPoint = await this.calculateReorderPoint(productId, warehouseId, tenantId);
    const currentStock = await this.getCurrentStock(productId, warehouseId, tenantId);
    
    return Math.max(eoq, reorderPoint - currentStock);
  }

  private async calculateDailyDemand(productId: string, warehouseId: string, tenantId: string): Promise<number> {
    return await this.getAverageDemand(productId, warehouseId, tenantId);
  }

  private async calculateStockoutCostImpact(
    productId: string,
    warehouseId: string,
    tenantId: string,
    daysUntilStockout: number,
  ): Promise<number> {
    // Stok tükenme maliyet etkisi
    const dailyDemand = await this.getAverageDemand(productId, warehouseId, tenantId);
    const unitCost = 100; // varsayılan birim maliyet
    const stockoutPenalty = 0.1; // %10 ceza
    
    return daysUntilStockout * dailyDemand * unitCost * stockoutPenalty;
  }

  private async calculateSeasonalFactors(historicalData: any[]): Promise<number[]> {
    // Mevsimsel faktörleri hesapla
    return [1.0, 1.0, 1.0, 1.0]; // varsayılan değerler
  }

  private analyzeTrend(historicalData: any[]): 'increasing' | 'decreasing' | 'stable' {
    // Trend analizi
    return 'stable'; // varsayılan
  }

  private calculateConfidenceLevel(historicalData: any[]): number {
    // Güven seviyesi hesaplama
    return 0.85; // %85 güven seviyesi
  }
}
