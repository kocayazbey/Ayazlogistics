import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

@Injectable()
export class WasteReductionService {
  private readonly logger = new Logger('WasteReductionService');

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async getWasteAnalytics(tenantId: string, period: { start: Date; end: Date }): Promise<any> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          waste_type, category, location_id,
          SUM(quantity) as total_quantity,
          SUM(recycled_quantity) as total_recycled,
          SUM(cost) as total_cost,
          SUM(co2_emissions) as total_co2
        FROM waste_tracking 
        WHERE tenant_id = ${tenantId}
          AND collection_date BETWEEN ${period.start} AND ${period.end}
        GROUP BY waste_type, category, location_id
      `);

      let totalWaste = 0;
      let totalRecycled = 0;
      let totalCost = 0;
      let totalCO2 = 0;
      const wasteByType: Record<string, number> = {};
      const wasteByCategory: Record<string, number> = {};
      const locationData: Record<string, number> = {};

      result.forEach(row => {
        const qty = parseFloat(String(row.total_quantity));
        totalWaste += qty;
        totalRecycled += parseFloat(String(row.total_recycled || '0'));
        totalCost += parseFloat(String(row.total_cost || '0'));
        totalCO2 += parseFloat(String(row.total_co2 || '0'));

        wasteByType[String(row.waste_type)] = (wasteByType[String(row.waste_type)] || 0) + qty;
        wasteByCategory[String(row.category)] = (wasteByCategory[String(row.category)] || 0) + qty;
        locationData[String(row.location_id)] = (locationData[String(row.location_id)] || 0) + qty;
      });

      const recyclingRate = totalWaste > 0 ? (totalRecycled / totalWaste) * 100 : 0;

      return {
        summary: {
          totalWaste,
          totalRecycled,
          totalCost,
          totalCO2,
          recyclingRate,
        },
        breakdown: {
          byType: wasteByType,
          byCategory: wasteByCategory,
          byLocation: locationData,
        },
        recommendations: this.generateRecommendations(wasteByType, recyclingRate),
      };
    } catch (error) {
      this.logger.error(`Error getting waste analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getWasteTrends(tenantId: string, period: { start: Date; end: Date }): Promise<any> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          DATE_TRUNC('month', collection_date) as month,
          SUM(quantity) as monthly_quantity
        FROM waste_tracking 
        WHERE tenant_id = ${tenantId}
          AND collection_date BETWEEN ${period.start} AND ${period.end}
        GROUP BY month
        ORDER BY month
      `);

      const trends = result.map((row, index) => {
        const currentQty = parseFloat(String(row.monthly_quantity));
        let changePercentage = 0;

        if (index > 0 && result[index - 1]) {
          const previousQty = parseFloat(String(result[index - 1].monthly_quantity));
          changePercentage = ((currentQty - previousQty) / previousQty) * 100;
        }

        return {
          month: new Date(String(row.month)).toISOString().substring(0, 7),
          quantity: currentQty,
          changePercentage,
        };
      });

      return {
        trends,
        averageMonthlyWaste: trends.reduce((sum, t) => sum + t.quantity, 0) / trends.length,
        overallTrend: trends.length > 1 && trends[0] && trends[trends.length - 1] ? 
          (trends[trends.length - 1].quantity - trends[0].quantity) / trends[0].quantity * 100 : 0,
      };
    } catch (error) {
      this.logger.error(`Error getting waste trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getReductionTargets(tenantId: string): Promise<any> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          waste_type, baseline_quantity, current_quantity, 
          target_reduction_percentage, status
        FROM waste_reduction_targets 
        WHERE tenant_id = ${tenantId}
        ORDER BY target_reduction_percentage DESC
      `);

      const progress = result.map(target => {
        const actualReduction = ((Number(target.baseline_quantity) - Number(target.current_quantity)) / Number(target.baseline_quantity)) * 100;
        const onTrack = actualReduction >= Number(target.target_reduction_percentage) * 0.9;

        return {
          wasteType: String(target.waste_type),
          baselineQuantity: Number(target.baseline_quantity),
          currentQuantity: Number(target.current_quantity),
          targetReduction: Number(target.target_reduction_percentage),
          actualReduction,
          status: String(target.status),
          onTrack,
          remainingReduction: Number(target.target_reduction_percentage) - actualReduction,
        };
      });

      return {
        targets: progress,
        overallProgress: progress.reduce((sum, p) => sum + p.actualReduction, 0) / progress.length,
        onTrackCount: progress.filter(p => p.onTrack).length,
        totalTargets: progress.length,
      };
    } catch (error) {
      this.logger.error(`Error getting reduction targets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getWasteHotspots(tenantId: string, threshold: number): Promise<any> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          location_id, waste_type, SUM(quantity) as total_quantity,
          SUM(cost) as total_cost, COUNT(*) as incident_count
        FROM waste_tracking 
        WHERE tenant_id = ${tenantId}
          AND quantity > ${threshold}
        GROUP BY location_id, waste_type
        ORDER BY total_quantity DESC
        LIMIT 10
      `);

      return result.map(row => ({
        location: String(row.location_id),
        wasteType: String(row.waste_type),
        quantity: parseFloat(String(row.total_quantity)),
        cost: parseFloat(String(row.total_cost)),
        incidentCount: parseInt(String(row.incident_count)),
        recommendation: this.generateRecommendation(String(row.waste_type)),
      }));
    } catch (error) {
      this.logger.error(`Error getting waste hotspots: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private generateRecommendations(wasteByType: Record<string, number>, recyclingRate: number): string[] {
    const recommendations: string[] = [];

    if (recyclingRate < 50) {
      recommendations.push('Implement comprehensive recycling program');
    }

    if (wasteByType['plastic'] && wasteByType['plastic'] > 1000) {
      recommendations.push('Reduce plastic packaging and implement alternatives');
    }

    if (wasteByType['food'] && wasteByType['food'] > 500) {
      recommendations.push('Implement food waste reduction strategies');
    }

    if (wasteByType['paper'] && wasteByType['paper'] > 2000) {
      recommendations.push('Go digital and reduce paper usage');
    }

    return recommendations;
  }

  private generateRecommendation(wasteType: string): string {
    const recommendations: Record<string, string> = {
      'plastic': 'Switch to biodegradable alternatives',
      'food': 'Implement composting program',
      'paper': 'Digitalize processes and use recycled paper',
      'metal': 'Implement metal recycling program',
      'glass': 'Set up glass collection and recycling',
    };

    return recommendations[wasteType] || 'Review waste management practices';
  }
}