import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface DriverPerformance {
  driverId: string;
  driverName: string;
  totalTrips: number;
  onTimeRate: number;
  safetyScore: number;
  customerRating: number;
  fuelEfficiency: number;
  maintenanceIncidents: number;
  violations: number;
  hoursWorked: number;
}

interface HoursOfService {
  driverId: string;
  date: Date;
  drivingHours: number;
  onDutyHours: number;
  offDutyHours: number;
  violations: string[];
  remainingDrivingTime: number;
  remainingOnDutyTime: number;
  mandatoryRestAt?: Date;
}

interface DriverSafetyEvent {
  driverId: string;
  eventType: 'harsh_braking' | 'speeding' | 'rapid_acceleration' | 'sharp_turn' | 'accident';
  severity: 'low' | 'medium' | 'high' | 'critical';
  date: Date;
  location: { lat: number; lng: number };
  speed?: number;
  description: string;
}

@Injectable()
export class DriverPerformanceService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async getDriverPerformance(driverId: string, startDate: Date, endDate: Date): Promise<DriverPerformance> {
    return {
      driverId,
      driverName: 'Mehmet Yılmaz',
      totalTrips: 85,
      onTimeRate: 94.1,
      safetyScore: 92,
      customerRating: 4.7,
      fuelEfficiency: 88,
      maintenanceIncidents: 2,
      violations: 1,
      hoursWorked: 176
    };
  }

  async trackHoursOfService(driverId: string, date: Date): Promise<HoursOfService> {
    const drivingHours = 9.5;
    const onDutyHours = 12;
    
    const violations = [];
    if (drivingHours > 11) violations.push('Exceeded daily driving limit (11h)');
    if (onDutyHours > 14) violations.push('Exceeded daily on-duty limit (14h)');

    return {
      driverId,
      date,
      drivingHours,
      onDutyHours,
      offDutyHours: 24 - onDutyHours,
      violations,
      remainingDrivingTime: Math.max(0, 11 - drivingHours),
      remainingOnDutyTime: Math.max(0, 14 - onDutyHours),
      mandatoryRestAt: drivingHours >= 8 ? new Date(Date.now() + 30 * 60000) : undefined
    };
  }

  async recordSafetyEvent(event: Partial<DriverSafetyEvent>): Promise<DriverSafetyEvent> {
    const safetyEvent: DriverSafetyEvent = {
      driverId: event.driverId!,
      eventType: event.eventType!,
      severity: event.severity!,
      date: event.date || new Date(),
      location: event.location!,
      speed: event.speed,
      description: event.description!
    };

    await this.eventBus.publish('driver.safety.event', {
      driverId: safetyEvent.driverId,
      eventType: safetyEvent.eventType,
      severity: safetyEvent.severity
    });

    return safetyEvent;
  }

  async generateDriverScorecard(driverId: string, month: number, year: number): Promise<any> {
    return {
      driverId,
      period: { month, year },
      overallScore: 89,
      metrics: {
        onTimeDelivery: { score: 94, weight: 25, points: 23.5 },
        safetyRecords: { score: 92, weight: 30, points: 27.6 },
        fuelEfficiency: { score: 88, weight: 20, points: 17.6 },
        customerFeedback: { score: 85, weight: 15, points: 12.75 },
        vehicleCare: { score: 90, weight: 10, points: 9 }
      },
      achievements: [
        'Zero accidents this month',
        '95% on-time delivery rate',
        'Fuel efficiency above fleet average'
      ],
      areasForImprovement: [
        'Reduce harsh braking incidents',
        'Improve customer communication'
      ],
      ranking: 8,
      totalDrivers: 45
    };
  }

  async getDriverAvailability(driverId: string, date: Date): Promise<any> {
    return {
      driverId,
      date,
      available: true,
      currentStatus: 'off_duty',
      hoursWorkedThisWeek: 42,
      hoursRemainingThisWeek: 18,
      nextScheduledTrip: new Date(Date.now() + 24 * 60 * 60 * 1000),
      restRequired: false,
      violations: []
    };
  }

  async assignDriver(tripId: string, driverId: string): Promise<any> {
    const availability = await this.getDriverAvailability(driverId, new Date());
    
    if (!availability.available) {
      throw new Error('Driver not available');
    }

    await this.eventBus.publish('driver.assigned', {
      tripId,
      driverId
    });

    return {
      tripId,
      driverId,
      assignedAt: new Date(),
      status: 'assigned'
    };
  }

  async getFleetDriverAnalytics(): Promise<any> {
    return {
      totalDrivers: 45,
      activeDrivers: 38,
      onTrip: 28,
      available: 10,
      onLeave: 4,
      inTraining: 3,
      averageExperience: 8.5,
      averageAge: 42,
      certifications: {
        adr: 25,
        iata: 12,
        hazmat: 18
      },
      performanceDistribution: {
        excellent: 15,
        good: 22,
        average: 6,
        needsImprovement: 2
      }
    };
  }
}

