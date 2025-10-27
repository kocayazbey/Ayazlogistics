import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface ColdChainRequirement {
  productId: string;
  minTemp: number;
  maxTemp: number;
  maxExcursionMinutes: number;
  requiresContinuousMonitoring: boolean;
  regulatoryStandard?: 'FDA' | 'EU_GDP' | 'WHO' | 'HACCP';
}

interface TemperatureExcursion {
  id: string;
  shipmentId: string;
  productId: string;
  sensorId: string;
  excursionType: 'high_temp' | 'low_temp';
  threshold: number;
  temperature: number;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  location?: string;
  severity: 'minor' | 'major' | 'critical';
  actionTaken?: string;
}

@Injectable()
export class ColdChainComplianceService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async validateColdChainCompliance(
    shipmentId: string,
    productId: string,
    temperatureReadings: Array<{ temperature: number; timestamp: Date }>,
    tenantId: string,
  ): Promise<{
    compliant: boolean;
    excursions: TemperatureExcursion[];
    report: any;
  }> {
    const requirement = await this.getColdChainRequirement(productId, tenantId);

    if (!requirement) {
      return {
        compliant: true,
        excursions: [],
        report: { message: 'No cold chain requirements for this product' },
      };
    }

    const excursions: TemperatureExcursion[] = [];
    let currentExcursion: TemperatureExcursion | null = null;

    for (const reading of temperatureReadings) {
      const isExcursion =
        reading.temperature > requirement.maxTemp ||
        reading.temperature < requirement.minTemp;

      if (isExcursion && !currentExcursion) {
        // Start new excursion
        currentExcursion = {
          id: `EXC-${Date.now()}`,
          shipmentId,
          productId,
          sensorId: 'SENSOR-01',
          excursionType: reading.temperature > requirement.maxTemp ? 'high_temp' : 'low_temp',
          threshold: reading.temperature > requirement.maxTemp ? requirement.maxTemp : requirement.minTemp,
          temperature: reading.temperature,
          startTime: reading.timestamp,
          severity: 'minor',
        };
      } else if (!isExcursion && currentExcursion) {
        // End excursion
        currentExcursion.endTime = reading.timestamp;
        currentExcursion.durationMinutes = Math.floor(
          (reading.timestamp.getTime() - currentExcursion.startTime.getTime()) / (1000 * 60),
        );

        // Determine severity
        if (currentExcursion.durationMinutes > requirement.maxExcursionMinutes) {
          currentExcursion.severity = 'critical';
        } else if (currentExcursion.durationMinutes > requirement.maxExcursionMinutes / 2) {
          currentExcursion.severity = 'major';
        }

        excursions.push(currentExcursion);
        currentExcursion = null;
      }
    }

    const compliant =
      excursions.filter(e => e.severity === 'critical').length === 0;

    return {
      compliant,
      excursions,
      report: {
        totalExcursions: excursions.length,
        criticalExcursions: excursions.filter(e => e.severity === 'critical').length,
        totalExcursionTime: excursions.reduce((sum, e) => sum + (e.durationMinutes || 0), 0),
      },
    };
  }

  async getColdChainRequirement(
    productId: string,
    tenantId: string,
  ): Promise<ColdChainRequirement | null> {
    // Mock: Would query product cold chain requirements
    return null;
  }

  async generateColdChainReport(
    shipmentId: string,
    tenantId: string,
  ): Promise<any> {
    return {
      shipmentId,
      compliant: true,
      temperatureRange: { min: 2, max: 8 },
      excursions: [],
      certificateUrl: null,
    };
  }
}

