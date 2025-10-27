import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '../../../core/events/event-bus.service';

interface CarbonEmission {
  id: string;
  source: 'transport' | 'warehouse' | 'packaging' | 'energy' | 'waste';
  activity: string;
  quantity: number;
  unit: string;
  emissionFactor: number; // kg CO2 per unit
  totalEmissions: number; // kg CO2
  timestamp: Date;
  location?: string;
  vehicleType?: string;
  fuelType?: string;
}

interface SustainabilityMetrics {
  totalEmissions: number;
  emissionsBySource: Record<string, number>;
  emissionsByLocation: Record<string, number>;
  emissionsByVehicle: Record<string, number>;
  carbonIntensity: number; // kg CO2 per unit of activity
  reductionTarget: number;
  progressToTarget: number;
}

interface GreenLogisticsRecommendation {
  id: string;
  type: 'route_optimization' | 'vehicle_efficiency' | 'packaging_reduction' | 'energy_efficiency';
  title: string;
  description: string;
  potentialSavings: number; // kg CO2
  implementationCost: number;
  paybackPeriod: number; // months
  priority: 'low' | 'medium' | 'high' | 'critical';
  isImplemented: boolean;
}

@Injectable()
export class CarbonFootprintService {
  private readonly logger = new Logger(CarbonFootprintService.name);
  private readonly emissions: Map<string, CarbonEmission> = new Map();
  private readonly emissionFactors: Map<string, number> = new Map();
  private readonly recommendations: Map<string, GreenLogisticsRecommendation> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
  ) {
    this.initializeEmissionFactors();
    this.initializeRecommendations();
  }

  /**
   * Record carbon emission
   */
  async recordEmission(emission: Omit<CarbonEmission, 'id' | 'totalEmissions' | 'timestamp'>): Promise<string> {
    const id = `emission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalEmissions = emission.quantity * emission.emissionFactor;
    
    const carbonEmission: CarbonEmission = {
      id,
      ...emission,
      totalEmissions,
      timestamp: new Date(),
    };

    this.emissions.set(id, carbonEmission);

    await this.eventBus.emit('carbon.emission.recorded', {
      emissionId: id,
      source: emission.source,
      totalEmissions,
    });

    this.logger.log(`Carbon emission recorded: ${totalEmissions.toFixed(2)} kg CO2`, {
      id,
      source: emission.source,
      activity: emission.activity,
    });

    return id;
  }

  /**
   * Calculate total emissions for a period
   */
  calculateTotalEmissions(startDate: Date, endDate: Date): number {
    const emissions = Array.from(this.emissions.values())
      .filter(emission => emission.timestamp >= startDate && emission.timestamp <= endDate);
    
    return emissions.reduce((total, emission) => total + emission.totalEmissions, 0);
  }

  /**
   * Get sustainability metrics
   */
  getSustainabilityMetrics(period: { start: Date; end: Date }): SustainabilityMetrics {
    const emissions = Array.from(this.emissions.values())
      .filter(emission => emission.timestamp >= period.start && emission.timestamp <= period.end);

    const totalEmissions = emissions.reduce((total, emission) => total + emission.totalEmissions, 0);

    const emissionsBySource: Record<string, number> = {};
    const emissionsByLocation: Record<string, number> = {};
    const emissionsByVehicle: Record<string, number> = {};

    emissions.forEach(emission => {
      emissionsBySource[emission.source] = (emissionsBySource[emission.source] || 0) + emission.totalEmissions;
      
      if (emission.location) {
        emissionsByLocation[emission.location] = (emissionsByLocation[emission.location] || 0) + emission.totalEmissions;
      }
      
      if (emission.vehicleType) {
        emissionsByVehicle[emission.vehicleType] = (emissionsByVehicle[emission.vehicleType] || 0) + emission.totalEmissions;
      }
    });

    const totalActivity = emissions.reduce((total, emission) => total + emission.quantity, 0);
    const carbonIntensity = totalActivity > 0 ? totalEmissions / totalActivity : 0;

    const reductionTarget = this.getReductionTarget();
    const progressToTarget = reductionTarget > 0 ? Math.max(0, (reductionTarget - totalEmissions) / reductionTarget) : 0;

    return {
      totalEmissions,
      emissionsBySource,
      emissionsByLocation,
      emissionsByVehicle,
      carbonIntensity,
      reductionTarget,
      progressToTarget,
    };
  }

  /**
   * Get carbon footprint by source
   */
  getEmissionsBySource(period: { start: Date; end: Date }): Array<{
    source: string;
    emissions: number;
    percentage: number;
    activities: string[];
  }> {
    const emissions = Array.from(this.emissions.values())
      .filter(emission => emission.timestamp >= period.start && emission.timestamp <= period.end);

    const totalEmissions = emissions.reduce((total, emission) => total + emission.totalEmissions, 0);
    const sourceMap = new Map<string, { emissions: number; activities: Set<string> }>();

    emissions.forEach(emission => {
      const existing = sourceMap.get(emission.source) || { emissions: 0, activities: new Set() };
      existing.emissions += emission.totalEmissions;
      existing.activities.add(emission.activity);
      sourceMap.set(emission.source, existing);
    });

    return Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      emissions: data.emissions,
      percentage: totalEmissions > 0 ? (data.emissions / totalEmissions) * 100 : 0,
      activities: Array.from(data.activities),
    }));
  }

  /**
   * Get green logistics recommendations
   */
  getGreenLogisticsRecommendations(): GreenLogisticsRecommendation[] {
    return Array.from(this.recommendations.values());
  }

  /**
   * Implement recommendation
   */
  async implementRecommendation(recommendationId: string): Promise<boolean> {
    const recommendation = this.recommendations.get(recommendationId);
    if (!recommendation) return false;

    recommendation.isImplemented = true;

    await this.eventBus.emit('sustainability.recommendation.implemented', {
      recommendationId,
      type: recommendation.type,
      potentialSavings: recommendation.potentialSavings,
    });

    this.logger.log(`Green logistics recommendation implemented: ${recommendation.title}`);
    return true;
  }

  /**
   * Calculate route carbon footprint
   */
  calculateRouteCarbonFootprint(
    distance: number, // km
    vehicleType: string,
    fuelType: string = 'diesel',
    loadFactor: number = 0.8
  ): number {
    const emissionFactor = this.getEmissionFactor(vehicleType, fuelType);
    return distance * emissionFactor * loadFactor;
  }

  /**
   * Calculate warehouse carbon footprint
   */
  calculateWarehouseCarbonFootprint(
    energyConsumption: number, // kWh
    area: number, // m²
    operations: number
  ): number {
    const energyEmissionFactor = 0.5; // kg CO2 per kWh
    const areaEmissionFactor = 0.1; // kg CO2 per m²
    const operationsEmissionFactor = 0.05; // kg CO2 per operation

    return (energyConsumption * energyEmissionFactor) + 
           (area * areaEmissionFactor) + 
           (operations * operationsEmissionFactor);
  }

  /**
   * Calculate packaging carbon footprint
   */
  calculatePackagingCarbonFootprint(
    material: string,
    weight: number, // kg
    volume: number // m³
  ): number {
    const materialFactors: Record<string, number> = {
      cardboard: 0.5,
      plastic: 2.0,
      wood: 0.3,
      metal: 1.5,
      paper: 0.4,
    };

    const factor = materialFactors[material.toLowerCase()] || 1.0;
    return weight * factor;
  }

  /**
   * Get carbon footprint report
   */
  generateCarbonFootprintReport(period: { start: Date; end: Date }): {
    summary: SustainabilityMetrics;
    bySource: Array<{ source: string; emissions: number; percentage: number; activities: string[] }>;
    byLocation: Array<{ location: string; emissions: number; percentage: number }>;
    byVehicle: Array<{ vehicleType: string; emissions: number; percentage: number }>;
    recommendations: GreenLogisticsRecommendation[];
    trends: Array<{ date: string; emissions: number }>;
  } {
    const summary = this.getSustainabilityMetrics(period);
    const bySource = this.getEmissionsBySource(period);
    const byLocation = this.getEmissionsByLocation(period);
    const byVehicle = this.getEmissionsByVehicle(period);
    const recommendations = this.getGreenLogisticsRecommendations();
    const trends = this.getEmissionTrends(period);

    return {
      summary,
      bySource,
      byLocation,
      byVehicle,
      recommendations,
      trends,
    };
  }

  /**
   * Get emission trends
   */
  private getEmissionTrends(period: { start: Date; end: Date }): Array<{ date: string; emissions: number }> {
    const emissions = Array.from(this.emissions.values())
      .filter(emission => emission.timestamp >= period.start && emission.timestamp <= period.end);

    const dailyEmissions = new Map<string, number>();
    
    emissions.forEach(emission => {
      const date = emission.timestamp.toISOString().split('T')[0];
      dailyEmissions.set(date, (dailyEmissions.get(date) || 0) + emission.totalEmissions);
    });

    return Array.from(dailyEmissions.entries())
      .map(([date, emissions]) => ({ date, emissions }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get emissions by location
   */
  private getEmissionsByLocation(period: { start: Date; end: Date }): Array<{ location: string; emissions: number; percentage: number }> {
    const emissions = Array.from(this.emissions.values())
      .filter(emission => emission.timestamp >= period.start && emission.timestamp <= period.end && emission.location);

    const totalEmissions = emissions.reduce((total, emission) => total + emission.totalEmissions, 0);
    const locationMap = new Map<string, number>();

    emissions.forEach(emission => {
      if (emission.location) {
        locationMap.set(emission.location, (locationMap.get(emission.location) || 0) + emission.totalEmissions);
      }
    });

    return Array.from(locationMap.entries()).map(([location, emissions]) => ({
      location,
      emissions,
      percentage: totalEmissions > 0 ? (emissions / totalEmissions) * 100 : 0,
    }));
  }

  /**
   * Get emissions by vehicle
   */
  private getEmissionsByVehicle(period: { start: Date; end: Date }): Array<{ vehicleType: string; emissions: number; percentage: number }> {
    const emissions = Array.from(this.emissions.values())
      .filter(emission => emission.timestamp >= period.start && emission.timestamp <= period.end && emission.vehicleType);

    const totalEmissions = emissions.reduce((total, emission) => total + emission.totalEmissions, 0);
    const vehicleMap = new Map<string, number>();

    emissions.forEach(emission => {
      if (emission.vehicleType) {
        vehicleMap.set(emission.vehicleType, (vehicleMap.get(emission.vehicleType) || 0) + emission.totalEmissions);
      }
    });

    return Array.from(vehicleMap.entries()).map(([vehicleType, emissions]) => ({
      vehicleType,
      emissions,
      percentage: totalEmissions > 0 ? (emissions / totalEmissions) * 100 : 0,
    }));
  }

  /**
   * Get emission factor
   */
  private getEmissionFactor(vehicleType: string, fuelType: string): number {
    const key = `${vehicleType}_${fuelType}`;
    return this.emissionFactors.get(key) || 0.2; // Default: 0.2 kg CO2 per km
  }

  /**
   * Get reduction target
   */
  private getReductionTarget(): number {
    return this.configService.get('CARBON_REDUCTION_TARGET', 1000); // kg CO2
  }

  /**
   * Initialize emission factors
   */
  private initializeEmissionFactors(): void {
    // Transport emission factors (kg CO2 per km)
    this.emissionFactors.set('truck_diesel', 0.8);
    this.emissionFactors.set('truck_electric', 0.1);
    this.emissionFactors.set('van_diesel', 0.3);
    this.emissionFactors.set('van_electric', 0.05);
    this.emissionFactors.set('bike_electric', 0.01);
    
    // Energy emission factors (kg CO2 per kWh)
    this.emissionFactors.set('electricity_grid', 0.5);
    this.emissionFactors.set('electricity_renewable', 0.05);
    this.emissionFactors.set('natural_gas', 0.2);
    
    // Packaging emission factors (kg CO2 per kg)
    this.emissionFactors.set('cardboard', 0.5);
    this.emissionFactors.set('plastic', 2.0);
    this.emissionFactors.set('wood', 0.3);
    this.emissionFactors.set('metal', 1.5);
  }

  /**
   * Initialize recommendations
   */
  private initializeRecommendations(): void {
    const recommendations: Omit<GreenLogisticsRecommendation, 'id'>[] = [
      {
        type: 'route_optimization',
        title: 'Optimize Delivery Routes',
        description: 'Use AI-powered route optimization to reduce fuel consumption by 15-20%',
        potentialSavings: 500,
        implementationCost: 10000,
        paybackPeriod: 12,
        priority: 'high',
        isImplemented: false,
      },
      {
        type: 'vehicle_efficiency',
        title: 'Switch to Electric Vehicles',
        description: 'Replace diesel vehicles with electric alternatives for last-mile delivery',
        potentialSavings: 800,
        implementationCost: 50000,
        paybackPeriod: 24,
        priority: 'medium',
        isImplemented: false,
      },
      {
        type: 'packaging_reduction',
        title: 'Reduce Packaging Materials',
        description: 'Implement right-sized packaging and reusable containers',
        potentialSavings: 200,
        implementationCost: 5000,
        paybackPeriod: 6,
        priority: 'high',
        isImplemented: false,
      },
      {
        type: 'energy_efficiency',
        title: 'Install Solar Panels',
        description: 'Install solar panels on warehouse roofs to reduce grid electricity consumption',
        potentialSavings: 300,
        implementationCost: 30000,
        paybackPeriod: 36,
        priority: 'medium',
        isImplemented: false,
      },
    ];

    recommendations.forEach(rec => {
      const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.recommendations.set(id, { id, ...rec });
    });
  }
}
