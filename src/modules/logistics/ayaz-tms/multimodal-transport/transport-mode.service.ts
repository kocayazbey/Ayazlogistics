import { Injectable, Inject } from '@nestjs/core';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

type TransportMode = 'sea' | 'air' | 'road' | 'rail' | 'multimodal';
type ServiceType = 'ftl' | 'ltl' | 'fcl' | 'lcl' | 'express' | 'economy';

interface TransportLeg {
  id: string;
  mode: TransportMode;
  serviceType: ServiceType;
  origin: string;
  destination: string;
  carrier: string;
  estimatedDuration: number;
  cost: number;
  sequence: number;
}

interface MultimodalRoute {
  id: string;
  legs: TransportLeg[];
  totalCost: number;
  totalDuration: number;
  co2Emissions: number;
}

@Injectable()
export class TransportModeService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async planMultimodalRoute(
    origin: string,
    destination: string,
    cargoDetails: {
      weight: number;
      volume: number;
      type: string;
      hazmat: boolean;
    },
    preferences: {
      costPriority: number;
      speedPriority: number;
      sustainabilityPriority: number;
    }
  ): Promise<MultimodalRoute[]> {
    const routes: MultimodalRoute[] = [];

    routes.push(await this.planSeaRoute(origin, destination, cargoDetails));
    routes.push(await this.planAirRoute(origin, destination, cargoDetails));
    routes.push(await this.planRoadRoute(origin, destination, cargoDetails));
    routes.push(await this.planSeaAirCombo(origin, destination, cargoDetails));
    routes.push(await this.planRoadSeaCombo(origin, destination, cargoDetails));

    return this.scoreAndRankRoutes(routes, preferences);
  }

  private async planSeaRoute(origin: string, destination: string, cargo: any): Promise<MultimodalRoute> {
    return {
      id: 'sea-1',
      legs: [
        {
          id: 'leg-1',
          mode: 'road',
          serviceType: 'ftl',
          origin,
          destination: 'Istanbul Port',
          carrier: 'Local Trucker',
          estimatedDuration: 4,
          cost: 2500,
          sequence: 1
        },
        {
          id: 'leg-2',
          mode: 'sea',
          serviceType: cargo.volume > 30 ? 'fcl' : 'lcl',
          origin: 'Istanbul Port',
          destination: 'Hamburg Port',
          carrier: 'Maersk Line',
          estimatedDuration: 168,
          cost: 15000,
          sequence: 2
        },
        {
          id: 'leg-3',
          mode: 'road',
          serviceType: 'ftl',
          origin: 'Hamburg Port',
          destination,
          carrier: 'EU Logistics',
          estimatedDuration: 8,
          cost: 3500,
          sequence: 3
        }
      ],
      totalCost: 21000,
      totalDuration: 180,
      co2Emissions: 450
    };
  }

  private async planAirRoute(origin: string, destination: string, cargo: any): Promise<MultimodalRoute> {
    return {
      id: 'air-1',
      legs: [
        {
          id: 'leg-1',
          mode: 'road',
          serviceType: 'express',
          origin,
          destination: 'Istanbul Airport',
          carrier: 'Airport Express',
          estimatedDuration: 2,
          cost: 1500,
          sequence: 1
        },
        {
          id: 'leg-2',
          mode: 'air',
          serviceType: 'express',
          origin: 'Istanbul Airport',
          destination: 'Frankfurt Airport',
          carrier: 'Turkish Cargo',
          estimatedDuration: 4,
          cost: 45000,
          sequence: 2
        },
        {
          id: 'leg-3',
          mode: 'road',
          serviceType: 'express',
          origin: 'Frankfurt Airport',
          destination,
          carrier: 'DHL Express',
          estimatedDuration: 3,
          cost: 2500,
          sequence: 3
        }
      ],
      totalCost: 49000,
      totalDuration: 9,
      co2Emissions: 2500
    };
  }

  private async planRoadRoute(origin: string, destination: string, cargo: any): Promise<MultimodalRoute> {
    const serviceType = cargo.weight > 15000 ? 'ftl' : 'ltl';
    
    return {
      id: 'road-1',
      legs: [
        {
          id: 'leg-1',
          mode: 'road',
          serviceType: serviceType as ServiceType,
          origin,
          destination,
          carrier: 'AyazTransport',
          estimatedDuration: 48,
          cost: serviceType === 'ftl' ? 8500 : 4200,
          sequence: 1
        }
      ],
      totalCost: serviceType === 'ftl' ? 8500 : 4200,
      totalDuration: 48,
      co2Emissions: 850
    };
  }

  private async planSeaAirCombo(origin: string, destination: string, cargo: any): Promise<MultimodalRoute> {
    return {
      id: 'combo-1',
      legs: [
        {
          id: 'leg-1',
          mode: 'road',
          serviceType: 'ftl',
          origin,
          destination: 'Izmir Port',
          carrier: 'Local',
          estimatedDuration: 6,
          cost: 2000,
          sequence: 1
        },
        {
          id: 'leg-2',
          mode: 'sea',
          serviceType: 'fcl',
          origin: 'Izmir Port',
          destination: 'Dubai Port',
          carrier: 'MSC',
          estimatedDuration: 120,
          cost: 12000,
          sequence: 2
        },
        {
          id: 'leg-3',
          mode: 'air',
          serviceType: 'express',
          origin: 'Dubai Airport',
          destination,
          carrier: 'Emirates',
          estimatedDuration: 6,
          cost: 25000,
          sequence: 3
        }
      ],
      totalCost: 39000,
      totalDuration: 132,
      co2Emissions: 1800
    };
  }

  private async planRoadSeaCombo(origin: string, destination: string, cargo: any): Promise<MultimodalRoute> {
    return {
      id: 'combo-2',
      legs: [
        {
          id: 'leg-1',
          mode: 'road',
          serviceType: 'ftl',
          origin,
          destination: 'Mersin Port',
          carrier: 'TIR Transport',
          estimatedDuration: 12,
          cost: 3500,
          sequence: 1
        },
        {
          id: 'leg-2',
          mode: 'sea',
          serviceType: 'fcl',
          origin: 'Mersin Port',
          destination,
          carrier: 'CMA CGM',
          estimatedDuration: 96,
          cost: 18000,
          sequence: 2
        }
      ],
      totalCost: 21500,
      totalDuration: 108,
      co2Emissions: 520
    };
  }

  private scoreAndRankRoutes(routes: MultimodalRoute[], preferences: any): MultimodalRoute[] {
    const scored = routes.map(route => {
      const costScore = (1 - route.totalCost / 50000) * preferences.costPriority;
      const speedScore = (1 - route.totalDuration / 200) * preferences.speedPriority;
      const sustainabilityScore = (1 - route.co2Emissions / 3000) * preferences.sustainabilityPriority;
      
      return {
        ...route,
        score: costScore + speedScore + sustainabilityScore
      };
    });

    return scored.sort((a: any, b: any) => b.score - a.score);
  }

  async getTransportModeCapabilities(mode: TransportMode): Promise<any> {
    const capabilities = {
      sea: {
        maxWeight: 30000,
        maxVolume: 60,
        avgSpeed: 25,
        costPerKm: 0.5,
        co2PerKm: 0.015,
        serviceTypes: ['fcl', 'lcl'],
        suitableFor: ['bulk', 'containers', 'heavy-machinery']
      },
      air: {
        maxWeight: 5000,
        maxVolume: 15,
        avgSpeed: 800,
        costPerKm: 8,
        co2PerKm: 0.5,
        serviceTypes: ['express', 'economy'],
        suitableFor: ['electronics', 'perishables', 'documents', 'urgent']
      },
      road: {
        maxWeight: 24000,
        maxVolume: 90,
        avgSpeed: 70,
        costPerKm: 1.2,
        co2PerKm: 0.062,
        serviceTypes: ['ftl', 'ltl'],
        suitableFor: ['general-cargo', 'local-delivery', 'door-to-door']
      },
      rail: {
        maxWeight: 50000,
        maxVolume: 120,
        avgSpeed: 50,
        costPerKm: 0.3,
        co2PerKm: 0.018,
        serviceTypes: ['fcl', 'bulk'],
        suitableFor: ['bulk', 'containers', 'long-distance']
      }
    };

    return capabilities[mode];
  }
}

