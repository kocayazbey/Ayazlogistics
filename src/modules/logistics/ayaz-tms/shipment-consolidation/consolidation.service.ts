import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface Shipment {
  id: string;
  customerId: string;
  origin: string;
  destination: string;
  weight: number;
  volume: number;
  pickupDate: Date;
  deliveryDate: Date;
  priority: 'low' | 'medium' | 'high';
}

interface ConsolidationGroup {
  id: string;
  route: string;
  shipments: Shipment[];
  totalWeight: number;
  totalVolume: number;
  utilizationRate: number;
  estimatedSavings: number;
  recommendedVehicle: string;
}

@Injectable()
export class ConsolidationService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async findConsolidationOpportunities(shipments: Shipment[]): Promise<ConsolidationGroup[]> {
    const groups = new Map<string, Shipment[]>();

    for (const shipment of shipments) {
      const key = `${shipment.origin}-${shipment.destination}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(shipment);
    }

    const consolidationGroups: ConsolidationGroup[] = [];

    for (const [route, routeShipments] of groups.entries()) {
      if (routeShipments.length > 1) {
        const totalWeight = routeShipments.reduce((sum, s) => sum + s.weight, 0);
        const totalVolume = routeShipments.reduce((sum, s) => sum + s.volume, 0);
        
        const savings = this.calculateSavings(routeShipments.length, totalWeight);

        consolidationGroups.push({
          id: `CONSOL-${Date.now()}-${route}`,
          route,
          shipments: routeShipments,
          totalWeight,
          totalVolume,
          utilizationRate: this.calculateUtilization(totalWeight, totalVolume),
          estimatedSavings: savings,
          recommendedVehicle: totalWeight > 15000 ? 'ftl-truck' : 'ltl-truck'
        });
      }
    }

    return consolidationGroups.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  }

  private calculateSavings(shipmentCount: number, totalWeight: number): number {
    const individualCost = shipmentCount * 3500;
    const consolidatedCost = totalWeight > 15000 ? 8500 : 5500;
    return Math.max(0, individualCost - consolidatedCost);
  }

  private calculateUtilization(weight: number, volume: number): number {
    const maxWeight = 24000;
    const maxVolume = 90;
    
    const weightUtil = (weight / maxWeight) * 100;
    const volumeUtil = (volume / maxVolume) * 100;
    
    return Math.min(weightUtil, volumeUtil);
  }

  async suggestOptimalPickupSequence(consolidationGroup: ConsolidationGroup): Promise<any> {
    const sorted = [...consolidationGroup.shipments].sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.pickupDate.getTime() - b.pickupDate.getTime();
    });

    return {
      consolidationId: consolidationGroup.id,
      recommendedSequence: sorted.map((s, idx) => ({
        sequence: idx + 1,
        shipmentId: s.id,
        customerId: s.customerId,
        pickupTime: this.calculateOptimalPickupTime(idx, sorted.length)
      })),
      totalPickupTime: sorted.length * 30,
      estimatedCompletionTime: new Date(Date.now() + sorted.length * 30 * 60000)
    };
  }

  private calculateOptimalPickupTime(index: number, total: number): Date {
    const baseTime = new Date();
    baseTime.setHours(8, 0, 0, 0);
    baseTime.setMinutes(baseTime.getMinutes() + index * 30);
    return baseTime;
  }
}

