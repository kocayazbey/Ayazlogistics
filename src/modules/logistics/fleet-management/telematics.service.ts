// =====================================================================================
// AYAZLOGISTICS - TELEMATICS & FLEET MONITORING SERVICE
// =====================================================================================
// Description: Real-time vehicle tracking, driver behavior, predictive maintenance
// Features: GPS tracking, fuel monitoring, driver scoring, maintenance predictions
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte, desc, asc } from 'drizzle-orm';
import { EventBusService } from '../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { pgTable, uuid, varchar, decimal, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
import { tenants } from '../../../database/schema/core/tenants.schema';

// =====================================================================================
// SCHEMA DEFINITIONS
// =====================================================================================

export const telematicsData = pgTable('telematics_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id').notNull(),
  deviceId: varchar('device_id', { length: 100 }).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  location: jsonb('location').notNull(),
  speed: decimal('speed', { precision: 6, scale: 2 }),
  heading: integer('heading'),
  odometer: decimal('odometer', { precision: 12, scale: 2 }),
  fuelLevel: decimal('fuel_level', { precision: 5, scale: 2 }),
  fuelConsumed: decimal('fuel_consumed', { precision: 8, scale: 3 }),
  engineRpm: integer('engine_rpm'),
  engineTemp: integer('engine_temp'),
  coolantTemp: integer('coolant_temp'),
  batteryVoltage: decimal('battery_voltage', { precision: 4, scale: 2 }),
  engineLoad: integer('engine_load'),
  throttlePosition: integer('throttle_position'),
  ignitionStatus: boolean('ignition_status'),
  diagnosticCodes: jsonb('diagnostic_codes'),
  driverBehavior: jsonb('driver_behavior'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const driverScores = pgTable('driver_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  driverId: uuid('driver_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull(),
  tripId: uuid('trip_id'),
  scoreDate: timestamp('score_date').notNull(),
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }).notNull(),
  safetyScore: decimal('safety_score', { precision: 5, scale: 2 }),
  fuelEfficiencyScore: decimal('fuel_efficiency_score', { precision: 5, scale: 2 }),
  complianceScore: decimal('compliance_score', { precision: 5, scale: 2 }),
  smoothnessScore: decimal('smoothness_score', { precision: 5, scale: 2 }),
  events: jsonb('events'),
  violations: jsonb('violations'),
  recommendations: jsonb('recommendations'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const maintenancePredictions = pgTable('maintenance_predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id').notNull(),
  predictionDate: timestamp('prediction_date').notNull(),
  componentType: varchar('component_type', { length: 100 }).notNull(),
  componentName: varchar('component_name', { length: 255 }).notNull(),
  currentCondition: varchar('current_condition', { length: 50 }),
  healthScore: decimal('health_score', { precision: 5, scale: 2 }),
  remainingUsefulLife: integer('remaining_useful_life'),
  remainingUsefulLifeUnit: varchar('remaining_useful_life_unit', { length: 20 }),
  failureProbability: decimal('failure_probability', { precision: 5, scale: 2 }),
  predictedFailureDate: timestamp('predicted_failure_date'),
  recommendedAction: varchar('recommended_action', { length: 50 }),
  recommendedActionDate: timestamp('recommended_action_date'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 2 }),
  indicators: jsonb('indicators'),
  confidence: decimal('confidence', { precision: 5, scale: 2 }),
  modelVersion: varchar('model_version', { length: 50 }),
  status: varchar('status', { length: 20 }).default('pending'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =====================================================================================
// INTERFACES
// =====================================================================================

interface TelematicsReading {
  vehicleId: string;
  deviceId: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy?: number;
  };
  speed: number;
  heading?: number;
  odometer?: number;
  fuelLevel?: number;
  fuelConsumed?: number;
  engineMetrics?: {
    rpm?: number;
    temperature?: number;
    coolantTemp?: number;
    batteryVoltage?: number;
    engineLoad?: number;
    throttlePosition?: number;
  };
  ignitionStatus: boolean;
  diagnosticCodes?: string[];
  driverBehavior?: {
    harshBraking?: boolean;
    harshAcceleration?: boolean;
    harshCornering?: boolean;
    speeding?: boolean;
    idling?: boolean;
  };
}

interface VehicleLocation {
  vehicleId: string;
  vehicleNumber: string;
  driverId?: string;
  driverName?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  speed: number;
  heading: number;
  status: 'moving' | 'stopped' | 'idling' | 'offline';
  lastUpdate: Date;
  tripId?: string;
  route?: string;
  eta?: Date;
  distanceToDestination?: number;
}

interface Trip {
  id: string;
  vehicleId: string;
  driverId: string;
  startTime: Date;
  endTime?: Date;
  startLocation: { latitude: number; longitude: number; address?: string };
  endLocation?: { latitude: number; longitude: number; address?: string };
  distance: number;
  duration: number;
  averageSpeed: number;
  maxSpeed: number;
  fuelConsumed: number;
  fuelEfficiency: number;
  idleTime: number;
  events: {
    harshBraking: number;
    harshAcceleration: number;
    harshCornering: number;
    speeding: number;
    idling: number;
  };
  routeDeviation: number;
  driverScore: number;
  cost: {
    fuel: number;
    maintenance: number;
    total: number;
  };
}

interface DriverPerformance {
  driverId: string;
  driverName: string;
  period: {
    start: Date;
    end: Date;
  };
  overallScore: number;
  scores: {
    safety: number;
    fuelEfficiency: number;
    compliance: number;
    smoothness: number;
  };
  statistics: {
    totalTrips: number;
    totalDistance: number;
    totalDrivingTime: number;
    averageSpeed: number;
    fuelEfficiency: number;
  };
  events: {
    harshBraking: number;
    harshAcceleration: number;
    harshCornering: number;
    speeding: number;
    idlingExcess: number;
  };
  violations: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
  trend: 'improving' | 'stable' | 'declining';
  rank: number;
  totalDrivers: number;
  recommendations: string[];
}

interface FleetUtilization {
  period: {
    start: Date;
    end: Date;
  };
  fleet: {
    totalVehicles: number;
    activeVehicles: number;
    inactiveVehicles: number;
    inMaintenance: number;
  };
  utilization: {
    overall: number;
    byVehicleType: Record<string, number>;
    averageDistancePerVehicle: number;
    averageHoursPerVehicle: number;
  };
  efficiency: {
    averageFuelEfficiency: number;
    totalFuelConsumed: number;
    totalDistance: number;
    totalCO2Emissions: number;
  };
  costs: {
    fuel: number;
    maintenance: number;
    depreciation: number;
    insurance: number;
    total: number;
    costPerKm: number;
    costPerHour: number;
  };
  recommendations: Array<{
    category: string;
    recommendation: string;
    potentialSavings: number;
  }>;
}

interface MaintenancePrediction {
  vehicleId: string;
  vehicleNumber: string;
  component: {
    type: string;
    name: string;
    currentCondition: string;
    healthScore: number;
  };
  prediction: {
    remainingUsefulLife: number;
    remainingUsefulLifeUnit: string;
    failureProbability: number;
    predictedFailureDate: Date;
    confidence: number;
  };
  recommendation: {
    action: 'monitor' | 'schedule_inspection' | 'schedule_maintenance' | 'urgent_replacement';
    actionDate: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedCost: number;
  };
  indicators: Array<{
    indicator: string;
    value: number;
    threshold: number;
    status: 'normal' | 'warning' | 'critical';
  }>;
  reasoning: string;
}

interface GeofenceAlert {
  alertId: string;
  vehicleId: string;
  vehicleNumber: string;
  geofenceName: string;
  alertType: 'entered' | 'exited' | 'dwelling';
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  duration?: number;
  authorized: boolean;
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class TelematicsService {
  private readonly logger = new Logger(TelematicsService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // TELEMATICS DATA INGESTION
  // =====================================================================================

  async ingestTelematicsData(tenantId: string, reading: TelematicsReading): Promise<void> {
    await this.db.insert(telematicsData).values({
      tenantId,
      vehicleId: reading.vehicleId,
      deviceId: reading.deviceId,
      timestamp: reading.timestamp,
      location: reading.location as any,
      speed: reading.speed?.toString(),
      heading: reading.heading,
      odometer: reading.odometer?.toString(),
      fuelLevel: reading.fuelLevel?.toString(),
      fuelConsumed: reading.fuelConsumed?.toString(),
      engineRpm: reading.engineMetrics?.rpm,
      engineTemp: reading.engineMetrics?.temperature,
      coolantTemp: reading.engineMetrics?.coolantTemp,
      batteryVoltage: reading.engineMetrics?.batteryVoltage?.toString(),
      engineLoad: reading.engineMetrics?.engineLoad,
      throttlePosition: reading.engineMetrics?.throttlePosition,
      ignitionStatus: reading.ignitionStatus,
      diagnosticCodes: reading.diagnosticCodes as any,
      driverBehavior: reading.driverBehavior as any,
    });

    // Check for anomalies
    if (reading.speed && reading.speed > 120) {
      await this.eventBus.emit('telematics.speeding.detected', {
        vehicleId: reading.vehicleId,
        speed: reading.speed,
        location: reading.location,
      });
    }

    if (reading.engineMetrics?.temperature && reading.engineMetrics.temperature > 110) {
      await this.eventBus.emit('telematics.engine.overheating', {
        vehicleId: reading.vehicleId,
        temperature: reading.engineMetrics.temperature,
      });
    }

    if (reading.diagnosticCodes && reading.diagnosticCodes.length > 0) {
      await this.eventBus.emit('telematics.diagnostic.codes', {
        vehicleId: reading.vehicleId,
        codes: reading.diagnosticCodes,
      });
    }
  }

  async bulkIngestTelematicsData(tenantId: string, readings: TelematicsReading[]): Promise<{
    successful: number;
    failed: number;
  }> {
    let successful = 0;
    let failed = 0;

    for (const reading of readings) {
      try {
        await this.ingestTelematicsData(tenantId, reading);
        successful++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to ingest telematics data: ${error.message}`);
      }
    }

    return { successful, failed };
  }

  // =====================================================================================
  // REAL-TIME VEHICLE TRACKING
  // =====================================================================================

  async getVehicleLocations(tenantId: string): Promise<VehicleLocation[]> {
    const cacheKey = this.cacheService.generateKey('vehicle_locations', tenantId);

    return this.cacheService.wrap(cacheKey, async () => {
      const latestReadings = await this.db
        .select()
        .from(telematicsData)
        .where(eq(telematicsData.tenantId, tenantId))
        .orderBy(desc(telematicsData.timestamp))
        .limit(1000);

      const vehicleMap = new Map<string, any>();

      latestReadings.forEach(reading => {
        if (!vehicleMap.has(reading.vehicleId) || 
            new Date(reading.timestamp) > new Date(vehicleMap.get(reading.vehicleId).timestamp)) {
          vehicleMap.set(reading.vehicleId, reading);
        }
      });

      const locations: VehicleLocation[] = Array.from(vehicleMap.values()).map(reading => {
        const location = reading.location as any;
        const speed = parseFloat(reading.speed || '0');
        const lastUpdate = new Date(reading.timestamp);
        const minutesSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60);

        let status: 'moving' | 'stopped' | 'idling' | 'offline' = 'offline';
        if (minutesSinceUpdate < 5) {
          if (speed > 5) status = 'moving';
          else if (reading.ignitionStatus) status = 'idling';
          else status = 'stopped';
        }

        return {
          vehicleId: reading.vehicleId,
          vehicleNumber: `VEH-${reading.vehicleId.slice(0, 8)}`,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          speed,
          heading: reading.heading || 0,
          status,
          lastUpdate,
        };
      });

      return locations;
    }, 30);
  }

  async getVehicleHistory(
    vehicleId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Array<{
    timestamp: Date;
    location: { latitude: number; longitude: number };
    speed: number;
    events: string[];
  }>> {
    const history = await this.db
      .select()
      .from(telematicsData)
      .where(
        and(
          eq(telematicsData.vehicleId, vehicleId),
          gte(telematicsData.timestamp, startTime),
          lte(telematicsData.timestamp, endTime),
        ),
      )
      .orderBy(asc(telematicsData.timestamp));

    return history.map(h => ({
      timestamp: new Date(h.timestamp),
      location: h.location as any,
      speed: parseFloat(h.speed || '0'),
      events: this.extractEvents(h.driverBehavior as any),
    }));
  }

  // =====================================================================================
  // DRIVER SCORING & BEHAVIOR
  // =====================================================================================

  async calculateDriverScore(
    tenantId: string,
    driverId: string,
    tripData: {
      distance: number;
      duration: number;
      fuelConsumed: number;
      events: {
        harshBraking: number;
        harshAcceleration: number;
        harshCornering: number;
        speeding: number;
        idling: number;
      };
    },
  ): Promise<{
    overallScore: number;
    safetyScore: number;
    fuelEfficiencyScore: number;
    complianceScore: number;
    smoothnessScore: number;
  }> {
    // Safety score (0-100)
    const totalHarshEvents = 
      tripData.events.harshBraking +
      tripData.events.harshAcceleration +
      tripData.events.harshCornering;

    const harshEventsPerKm = tripData.distance > 0 ? totalHarshEvents / (tripData.distance / 1000) : 0;
    const safetyScore = Math.max(0, 100 - (harshEventsPerKm * 20));

    // Fuel efficiency score
    const expectedFuelConsumption = tripData.distance * 0.30; // L per km
    const actualFuelConsumption = tripData.fuelConsumed;
    const fuelEfficiencyRatio = actualFuelConsumption > 0 
      ? expectedFuelConsumption / actualFuelConsumption 
      : 1;
    const fuelEfficiencyScore = Math.min(100, fuelEfficiencyRatio * 100);

    // Compliance score (speeding)
    const speedingEventsPerHour = tripData.duration > 0 
      ? (tripData.events.speeding / (tripData.duration / 3600))
      : 0;
    const complianceScore = Math.max(0, 100 - (speedingEventsPerHour * 10));

    // Smoothness score
    const smoothnessScore = Math.max(0, 100 - (totalHarshEvents / tripData.distance * 1000 * 5));

    // Overall score (weighted average)
    const overallScore = 
      (safetyScore * 0.40) +
      (fuelEfficiencyScore * 0.25) +
      (complianceScore * 0.20) +
      (smoothnessScore * 0.15);

    await this.db.insert(driverScores).values({
      tenantId,
      driverId,
      vehicleId: 'vehicle-id', // Would come from trip data
      scoreDate: new Date(),
      overallScore: overallScore.toFixed(2),
      safetyScore: safetyScore.toFixed(2),
      fuelEfficiencyScore: fuelEfficiencyScore.toFixed(2),
      complianceScore: complianceScore.toFixed(2),
      smoothnessScore: smoothnessScore.toFixed(2),
      events: tripData.events as any,
    });

    return {
      overallScore: parseFloat(overallScore.toFixed(2)),
      safetyScore: parseFloat(safetyScore.toFixed(2)),
      fuelEfficiencyScore: parseFloat(fuelEfficiencyScore.toFixed(2)),
      complianceScore: parseFloat(complianceScore.toFixed(2)),
      smoothnessScore: parseFloat(smoothnessScore.toFixed(2)),
    };
  }

  async getDriverPerformance(
    driverId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DriverPerformance> {
    const scores = await this.db
      .select()
      .from(driverScores)
      .where(
        and(
          eq(driverScores.driverId, driverId),
          gte(driverScores.scoreDate, startDate),
          lte(driverScores.scoreDate, endDate),
        ),
      );

    if (scores.length === 0) {
      throw new NotFoundException('No performance data found for driver');
    }

    const avgOverall = scores.reduce((sum, s) => sum + parseFloat(s.overallScore), 0) / scores.length;
    const avgSafety = scores.reduce((sum, s) => sum + parseFloat(s.safetyScore || '0'), 0) / scores.length;
    const avgFuel = scores.reduce((sum, s) => sum + parseFloat(s.fuelEfficiencyScore || '0'), 0) / scores.length;
    const avgCompliance = scores.reduce((sum, s) => sum + parseFloat(s.complianceScore || '0'), 0) / scores.length;
    const avgSmoothness = scores.reduce((sum, s) => sum + parseFloat(s.smoothnessScore || '0'), 0) / scores.length;

    const totalEvents = scores.reduce((sum, s) => {
      const events = s.events as any || {};
      return {
        harshBraking: sum.harshBraking + (events.harshBraking || 0),
        harshAcceleration: sum.harshAcceleration + (events.harshAcceleration || 0),
        harshCornering: sum.harshCornering + (events.harshCornering || 0),
        speeding: sum.speeding + (events.speeding || 0),
        idling: sum.idling + (events.idling || 0),
      };
    }, { harshBraking: 0, harshAcceleration: 0, harshCornering: 0, speeding: 0, idling: 0 });

    // Determine trend
    const recentScores = scores.slice(-10);
    const olderScores = scores.slice(0, scores.length - 10);
    const recentAvg = recentScores.reduce((sum, s) => sum + parseFloat(s.overallScore), 0) / recentScores.length;
    const olderAvg = olderScores.length > 0
      ? olderScores.reduce((sum, s) => sum + parseFloat(s.overallScore), 0) / olderScores.length
      : recentAvg;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentAvg > olderAvg + 2) trend = 'improving';
    else if (recentAvg < olderAvg - 2) trend = 'declining';

    const recommendations: string[] = [];
    if (avgSafety < 70) recommendations.push('Attend defensive driving course');
    if (avgFuel < 70) recommendations.push('Training on fuel-efficient driving techniques');
    if (avgCompliance < 70) recommendations.push('Review speed limit compliance');
    if (totalEvents.harshBraking > 50) recommendations.push('Focus on smoother braking');

    return {
      driverId,
      driverName: `Driver ${driverId.slice(0, 8)}`,
      period: { start: startDate, end: endDate },
      overallScore: parseFloat(avgOverall.toFixed(2)),
      scores: {
        safety: parseFloat(avgSafety.toFixed(2)),
        fuelEfficiency: parseFloat(avgFuel.toFixed(2)),
        compliance: parseFloat(avgCompliance.toFixed(2)),
        smoothness: parseFloat(avgSmoothness.toFixed(2)),
      },
      statistics: {
        totalTrips: scores.length,
        totalDistance: scores.length * 150, // Mock
        totalDrivingTime: scores.length * 180, // Mock minutes
        averageSpeed: 65,
        fuelEfficiency: 7.5,
      },
      events: totalEvents,
      violations: [],
      trend,
      rank: 15,
      totalDrivers: 50,
      recommendations,
    };
  }

  // =====================================================================================
  // PREDICTIVE MAINTENANCE
  // =====================================================================================

  async predictMaintenance(vehicleId: string): Promise<MaintenancePrediction[]> {
    this.logger.log(`Generating maintenance predictions for vehicle ${vehicleId}`);

    // Get recent telematics data
    const recentData = await this.db
      .select()
      .from(telematicsData)
      .where(eq(telematicsData.vehicleId, vehicleId))
      .orderBy(desc(telematicsData.timestamp))
      .limit(1000);

    const predictions: MaintenancePrediction[] = [];

    // Engine health prediction
    const avgEngineTemp = recentData
      .filter(d => d.engineTemp)
      .reduce((sum, d) => sum + (d.engineTemp || 0), 0) / recentData.length;

    const avgEngineRpm = recentData
      .filter(d => d.engineRpm)
      .reduce((sum, d) => sum + (d.engineRpm || 0), 0) / recentData.length;

    if (avgEngineTemp > 95 || avgEngineRpm > 2500) {
      const healthScore = Math.max(0, 100 - ((avgEngineTemp - 85) * 2) - ((avgEngineRpm - 2000) / 10));
      const failureProbability = 100 - healthScore;

      const rul = Math.max(0, Math.round((healthScore / 100) * 180)); // days

      predictions.push({
        vehicleId,
        vehicleNumber: `VEH-${vehicleId.slice(0, 8)}`,
        component: {
          type: 'engine',
          name: 'Engine Assembly',
          currentCondition: healthScore > 70 ? 'good' : healthScore > 50 ? 'fair' : 'poor',
          healthScore: parseFloat(healthScore.toFixed(2)),
        },
        prediction: {
          remainingUsefulLife: rul,
          remainingUsefulLifeUnit: 'days',
          failureProbability: parseFloat(failureProbability.toFixed(2)),
          predictedFailureDate: new Date(Date.now() + rul * 24 * 60 * 60 * 1000),
          confidence: 82,
        },
        recommendation: {
          action: healthScore < 50 ? 'schedule_maintenance' : healthScore < 70 ? 'schedule_inspection' : 'monitor',
          actionDate: new Date(Date.now() + (rul * 0.7) * 24 * 60 * 60 * 1000),
          priority: healthScore < 50 ? 'high' : healthScore < 70 ? 'medium' : 'low',
          estimatedCost: 2500,
        },
        indicators: [
          {
            indicator: 'Average Engine Temperature',
            value: avgEngineTemp,
            threshold: 95,
            status: avgEngineTemp > 95 ? 'critical' : avgEngineTemp > 90 ? 'warning' : 'normal',
          },
          {
            indicator: 'Average Engine RPM',
            value: avgEngineRpm,
            threshold: 2500,
            status: avgEngineRpm > 2500 ? 'warning' : 'normal',
          },
        ],
        reasoning: `Based on elevated engine temperature (${avgEngineTemp.toFixed(1)}°C) and RPM patterns`,
      });
    }

    // Battery health
    const avgBatteryVoltage = recentData
      .filter(d => d.batteryVoltage)
      .reduce((sum, d) => sum + parseFloat(d.batteryVoltage || '0'), 0) / recentData.length;

    if (avgBatteryVoltage < 12.4) {
      predictions.push({
        vehicleId,
        vehicleNumber: `VEH-${vehicleId.slice(0, 8)}`,
        component: {
          type: 'electrical',
          name: 'Battery',
          currentCondition: avgBatteryVoltage < 12.0 ? 'critical' : 'warning',
          healthScore: (avgBatteryVoltage / 12.6) * 100,
        },
        prediction: {
          remainingUsefulLife: avgBatteryVoltage < 12.0 ? 7 : 30,
          remainingUsefulLifeUnit: 'days',
          failureProbability: avgBatteryVoltage < 12.0 ? 85 : 40,
          predictedFailureDate: new Date(Date.now() + (avgBatteryVoltage < 12.0 ? 7 : 30) * 24 * 60 * 60 * 1000),
          confidence: 88,
        },
        recommendation: {
          action: avgBatteryVoltage < 12.0 ? 'urgent_replacement' : 'schedule_maintenance',
          actionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          priority: avgBatteryVoltage < 12.0 ? 'critical' : 'medium',
          estimatedCost: 250,
        },
        indicators: [
          {
            indicator: 'Battery Voltage',
            value: avgBatteryVoltage,
            threshold: 12.4,
            status: avgBatteryVoltage < 12.0 ? 'critical' : avgBatteryVoltage < 12.4 ? 'warning' : 'normal',
          },
        ],
        reasoning: `Low battery voltage detected (${avgBatteryVoltage.toFixed(2)}V)`,
      });
    }

    // Save predictions
    for (const prediction of predictions) {
      await this.db.insert(maintenancePredictions).values({
        tenantId: 'tenant-id',
        vehicleId: prediction.vehicleId,
        predictionDate: new Date(),
        componentType: prediction.component.type,
        componentName: prediction.component.name,
        currentCondition: prediction.component.currentCondition,
        healthScore: prediction.component.healthScore.toString(),
        remainingUsefulLife: prediction.prediction.remainingUsefulLife,
        remainingUsefulLifeUnit: prediction.prediction.remainingUsefulLifeUnit,
        failureProbability: prediction.prediction.failureProbability.toString(),
        predictedFailureDate: prediction.prediction.predictedFailureDate,
        recommendedAction: prediction.recommendation.action,
        recommendedActionDate: prediction.recommendation.actionDate,
        priority: prediction.recommendation.priority,
        estimatedCost: prediction.recommendation.estimatedCost.toString(),
        indicators: prediction.indicators as any,
        confidence: prediction.prediction.confidence.toString(),
        modelVersion: 'v2.1.0',
        status: 'pending',
      });
    }

    return predictions;
  }

  // =====================================================================================
  // FLEET ANALYTICS
  // =====================================================================================

  async getFleetUtilization(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FleetUtilization> {
    this.logger.log('Calculating fleet utilization');

    // Mock data - would calculate from actual telematics
    return {
      period: { start: startDate, end: endDate },
      fleet: {
        totalVehicles: 50,
        activeVehicles: 42,
        inactiveVehicles: 5,
        inMaintenance: 3,
      },
      utilization: {
        overall: 84,
        byVehicleType: {
          'Heavy Truck': 88,
          'Light Truck': 82,
          'Van': 79,
        },
        averageDistancePerVehicle: 3500,
        averageHoursPerVehicle: 180,
      },
      efficiency: {
        averageFuelEfficiency: 7.2,
        totalFuelConsumed: 25000,
        totalDistance: 180000,
        totalCO2Emissions: 67500,
      },
      costs: {
        fuel: 750000,
        maintenance: 150000,
        depreciation: 200000,
        insurance: 50000,
        total: 1150000,
        costPerKm: 6.39,
        costPerHour: 127.78,
      },
      recommendations: [
        {
          category: 'Utilization',
          recommendation: 'Redistribute workload to underutilized vehicles',
          potentialSavings: 50000,
        },
        {
          category: 'Fuel Efficiency',
          recommendation: 'Driver training program for top 20% fuel consumers',
          potentialSavings: 75000,
        },
        {
          category: 'Maintenance',
          recommendation: 'Implement predictive maintenance to reduce unplanned downtime',
          potentialSavings: 40000,
        },
      ],
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private extractEvents(driverBehavior: any): string[] {
    if (!driverBehavior) return [];

    const events: string[] = [];
    if (driverBehavior.harshBraking) events.push('harsh_braking');
    if (driverBehavior.harshAcceleration) events.push('harsh_acceleration');
    if (driverBehavior.harshCornering) events.push('harsh_cornering');
    if (driverBehavior.speeding) events.push('speeding');
    if (driverBehavior.idling) events.push('excessive_idling');

    return events;
  }
}

