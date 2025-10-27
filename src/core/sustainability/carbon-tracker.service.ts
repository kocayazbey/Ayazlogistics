import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface EmissionFactors {
  diesel: number; // kg CO2 per liter
  gasoline: number;
  electricity: number; // kg CO2 per kWh
  naturalGas: number; // kg CO2 per m³
}

interface CarbonFootprint {
  periodStart: Date;
  periodEnd: Date;
  totalEmissions: number; // kg CO2
  breakdown: {
    transportation: number;
    warehouses: number;
    offices: number;
    other: number;
  };
  recommendations: string[];
  comparison: {
    previousPeriod: number;
    change: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

@Injectable()
export class CarbonTrackerService {
  private readonly logger = new Logger(CarbonTrackerService.name);
  
  private readonly EMISSION_FACTORS: EmissionFactors = {
    diesel: 2.68, // kg CO2 per liter
    gasoline: 2.31,
    electricity: 0.5, // kg CO2 per kWh (Turkey grid average)
    naturalGas: 1.9, // kg CO2 per m³
  };

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async calculateTransportationEmissions(
    fuelConsumed: number,
    fuelType: 'diesel' | 'gasoline' = 'diesel',
  ): Promise<number> {
    return fuelConsumed * this.EMISSION_FACTORS[fuelType];
  }

  async calculateWarehouseEmissions(
    electricityUsage: number, // kWh
    heatingGasUsage: number = 0, // m³
  ): Promise<number> {
    const electricityEmissions = electricityUsage * this.EMISSION_FACTORS.electricity;
    const gasEmissions = heatingGasUsage * this.EMISSION_FACTORS.naturalGas;
    return electricityEmissions + gasEmissions;
  }

  async generateCarbonFootprintReport(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<CarbonFootprint> {
    this.logger.log(`Generating carbon footprint report for ${periodStart} to ${periodEnd}`);

    const transportationEmissions = await this.getTransportationEmissions(tenantId, periodStart, periodEnd);
    const warehouseEmissions = await this.getWarehouseEmissions(tenantId, periodStart, periodEnd);
    
    const totalEmissions = transportationEmissions + warehouseEmissions;

    const previousPeriodStart = new Date(periodStart);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
    const previousPeriodEnd = periodStart;
    
    const previousEmissions = await this.getPreviousPeriodEmissions(tenantId, previousPeriodStart, previousPeriodEnd);
    const change = ((totalEmissions - previousEmissions) / previousEmissions) * 100;

    const recommendations: string[] = [];
    if (transportationEmissions > totalEmissions * 0.7) {
      recommendations.push('Optimize routes to reduce fuel consumption');
      recommendations.push('Consider electric or hybrid vehicles');
    }
    if (warehouseEmissions > totalEmissions * 0.3) {
      recommendations.push('Install solar panels for renewable energy');
      recommendations.push('Improve warehouse insulation');
    }

    return {
      periodStart,
      periodEnd,
      totalEmissions,
      breakdown: {
        transportation: transportationEmissions,
        warehouses: warehouseEmissions,
        offices: 0,
        other: 0,
      },
      recommendations,
      comparison: {
        previousPeriod: previousEmissions,
        change,
        trend: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      },
    };
  }

  private async getTransportationEmissions(tenantId: string, start: Date, end: Date): Promise<number> {
    return 5000 + Math.random() * 2000;
  }

  private async getWarehouseEmissions(tenantId: string, start: Date, end: Date): Promise<number> {
    return 1500 + Math.random() * 500;
  }

  private async getPreviousPeriodEmissions(tenantId: string, start: Date, end: Date): Promise<number> {
    const current = await this.getTransportationEmissions(tenantId, start, end);
    return current * (0.9 + Math.random() * 0.2);
  }

  async optimizeRouteForGreenLogistics(waypoints: Array<{ lat: number; lng: number }>): Promise<any> {
    this.logger.log('Calculating eco-friendly route');
    
    return {
      route: waypoints,
      estimatedEmissions: 45.5,
      emissionsSaved: 12.3,
      alternativeRoutes: [],
    };
  }
}

