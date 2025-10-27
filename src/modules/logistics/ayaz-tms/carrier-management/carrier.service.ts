import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface Carrier {
  id: string;
  name: string;
  type: 'sea' | 'air' | 'road' | 'rail';
  serviceTypes: string[];
  performanceScore: number;
  onTimeRate: number;
  damageRate: number;
  coverageAreas: string[];
  rateCard: any;
}

interface CarrierBid {
  carrierId: string;
  carrierName: string;
  rate: number;
  currency: string;
  transitTime: number;
  validUntil: Date;
  terms: string;
  insuranceIncluded: boolean;
}

@Injectable()
export class CarrierManagementService {
  private carriers: Carrier[] = [
    {
      id: 'carrier-sea-1',
      name: 'Maersk Line',
      type: 'sea',
      serviceTypes: ['fcl', 'lcl'],
      performanceScore: 95,
      onTimeRate: 94,
      damageRate: 0.5,
      coverageAreas: ['Europe', 'Asia', 'Americas'],
      rateCard: {}
    },
    {
      id: 'carrier-sea-2',
      name: 'MSC Mediterranean',
      type: 'sea',
      serviceTypes: ['fcl', 'lcl'],
      performanceScore: 92,
      onTimeRate: 91,
      damageRate: 0.8,
      coverageAreas: ['Mediterranean', 'Middle East'],
      rateCard: {}
    },
    {
      id: 'carrier-air-1',
      name: 'Turkish Cargo',
      type: 'air',
      serviceTypes: ['express', 'economy'],
      performanceScore: 96,
      onTimeRate: 97,
      damageRate: 0.3,
      coverageAreas: ['Global'],
      rateCard: {}
    },
    {
      id: 'carrier-air-2',
      name: 'Lufthansa Cargo',
      type: 'air',
      serviceTypes: ['express', 'economy'],
      performanceScore: 94,
      onTimeRate: 95,
      damageRate: 0.4,
      coverageAreas: ['Europe', 'Americas', 'Asia'],
      rateCard: {}
    },
    {
      id: 'carrier-road-1',
      name: 'AyazTransport',
      type: 'road',
      serviceTypes: ['ftl', 'ltl'],
      performanceScore: 89,
      onTimeRate: 88,
      damageRate: 1.2,
      coverageAreas: ['Turkey', 'Balkans'],
      rateCard: {}
    }
  ];

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async getCarriers(mode?: string, serviceType?: string): Promise<Carrier[]> {
    let filtered = this.carriers;

    if (mode) {
      filtered = filtered.filter(c => c.type === mode);
    }

    if (serviceType) {
      filtered = filtered.filter(c => c.serviceTypes.includes(serviceType));
    }

    return filtered.sort((a, b) => b.performanceScore - a.performanceScore);
  }

  async requestBids(shipmentDetails: {
    origin: string;
    destination: string;
    mode: string;
    serviceType: string;
    weight: number;
    volume: number;
    pickupDate: Date;
  }): Promise<CarrierBid[]> {
    const eligibleCarriers = await this.getCarriers(shipmentDetails.mode, shipmentDetails.serviceType);

    const bids: CarrierBid[] = [];

    for (const carrier of eligibleCarriers) {
      const baseRate = this.calculateBaseRate(shipmentDetails, carrier);
      const adjustedRate = baseRate * (1 + (100 - carrier.performanceScore) / 100);

      bids.push({
        carrierId: carrier.id,
        carrierName: carrier.name,
        rate: adjustedRate,
        currency: 'TRY',
        transitTime: this.estimateTransitTime(shipmentDetails.mode),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        terms: 'Standard terms apply',
        insuranceIncluded: carrier.performanceScore > 90
      });
    }

    return bids.sort((a, b) => a.rate - b.rate);
  }

  private calculateBaseRate(shipment: any, carrier: Carrier): number {
    const baseRates: Record<string, number> = {
      sea: 0.5,
      air: 8,
      road: 1.2,
      rail: 0.4
    };

    const ratePerKm = baseRates[carrier.type] || 1;
    const distance = 1500;
    
    return distance * ratePerKm * shipment.weight * 0.01;
  }

  private estimateTransitTime(mode: string): number {
    const times: Record<string, number> = {
      sea: 168,
      air: 8,
      road: 48,
      rail: 96
    };
    return times[mode] || 48;
  }

  async selectCarrier(bids: CarrierBid[], criteria: {
    maxBudget?: number;
    maxTransitTime?: number;
    preferredCarrier?: string;
  }): Promise<CarrierBid> {
    let eligible = [...bids];

    if (criteria.maxBudget) {
      eligible = eligible.filter(b => b.rate <= criteria.maxBudget);
    }

    if (criteria.maxTransitTime) {
      eligible = eligible.filter(b => b.transitTime <= criteria.maxTransitTime);
    }

    if (criteria.preferredCarrier) {
      const preferred = eligible.find(b => b.carrierId === criteria.preferredCarrier);
      if (preferred) return preferred;
    }

    return eligible[0];
  }

  async trackCarrierPerformance(carrierId: string, startDate: Date, endDate: Date): Promise<any> {
    return {
      carrierId,
      period: { startDate, endDate },
      totalShipments: 245,
      onTimeDeliveries: 229,
      onTimeRate: 93.5,
      averageTransitTime: 46,
      damageIncidents: 2,
      damageRate: 0.8,
      claims: 1,
      claimAmount: 5000,
      performanceScore: 93,
      rating: 'Excellent'
    };
  }

  async updateCarrierPerformance(carrierId: string, shipmentResult: {
    onTime: boolean;
    damaged: boolean;
    transitTime: number;
  }): Promise<void> {
    const carrier = this.carriers.find(c => c.id === carrierId);
    if (carrier) {
      await this.eventBus.publish('carrier.performance.updated', {
        carrierId,
        onTime: shipmentResult.onTime,
        damaged: shipmentResult.damaged
      });
    }
  }
}

