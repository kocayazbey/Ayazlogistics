import { Injectable } from '@nestjs/common';

type LoadType = 'ftl' | 'ltl' | 'partial' | 'full';

interface LoadItem {
  id: string;
  weight: number;
  volume: number;
  length: number;
  width: number;
  height: number;
  stackable: boolean;
  fragile: boolean;
  customerId: string;
}

interface Vehicle {
  id: string;
  capacity: number;
  volumeCapacity: number;
  dimensions: { length: number; width: number; height: number };
  type: 'truck' | 'van' | 'container';
}

interface LoadPlan {
  vehicleId: string;
  loadType: LoadType;
  items: LoadItem[];
  totalWeight: number;
  totalVolume: number;
  utilizationRate: number;
  costEfficiency: number;
}

@Injectable()
export class LoadPlanningService {
  async optimizeLoad(items: LoadItem[], vehicles: Vehicle[]): Promise<LoadPlan[]> {
    const plans: LoadPlan[] = [];

    const sortedItems = [...items].sort((a, b) => b.weight - a.weight);
    const availableVehicles = [...vehicles];

    for (const vehicle of availableVehicles) {
      const plan = this.createLoadPlan(sortedItems, vehicle);
      if (plan.items.length > 0) {
        plans.push(plan);
        sortedItems.splice(0, plan.items.length);
      }
    }

    return plans;
  }

  private createLoadPlan(items: LoadItem[], vehicle: Vehicle): LoadPlan {
    const selectedItems: LoadItem[] = [];
    let totalWeight = 0;
    let totalVolume = 0;

    for (const item of items) {
      if (
        totalWeight + item.weight <= vehicle.capacity &&
        totalVolume + item.volume <= vehicle.volumeCapacity &&
        this.fitsInVehicle(item, vehicle)
      ) {
        selectedItems.push(item);
        totalWeight += item.weight;
        totalVolume += item.volume;
      }
    }

    const weightUtilization = (totalWeight / vehicle.capacity) * 100;
    const volumeUtilization = (totalVolume / vehicle.volumeCapacity) * 100;
    const utilizationRate = Math.min(weightUtilization, volumeUtilization);

    const loadType = this.determineLoadType(utilizationRate, selectedItems);

    return {
      vehicleId: vehicle.id,
      loadType,
      items: selectedItems,
      totalWeight,
      totalVolume,
      utilizationRate,
      costEfficiency: this.calculateCostEfficiency(totalWeight, vehicle.capacity)
    };
  }

  private fitsInVehicle(item: LoadItem, vehicle: Vehicle): boolean {
    return (
      item.length <= vehicle.dimensions.length &&
      item.width <= vehicle.dimensions.width &&
      item.height <= vehicle.dimensions.height
    );
  }

  private determineLoadType(utilization: number, items: LoadItem[]): LoadType {
    const uniqueCustomers = new Set(items.map(i => i.customerId)).size;
    
    if (utilization >= 90 && uniqueCustomers === 1) return 'ftl';
    if (utilization >= 50 && uniqueCustomers === 1) return 'partial';
    if (uniqueCustomers > 1) return 'ltl';
    return 'partial';
  }

  private calculateCostEfficiency(actualWeight: number, capacity: number): number {
    return (actualWeight / capacity) * 100;
  }

  async consolidateShipments(shipments: any[]): Promise<any> {
    const grouped = new Map<string, any[]>();

    for (const shipment of shipments) {
      const key = `${shipment.origin}-${shipment.destination}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(shipment);
    }

    const consolidatedLoads = [];
    for (const [route, items] of grouped.entries()) {
      const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
      const totalVolume = items.reduce((sum, item) => sum + item.volume, 0);
      
      consolidatedLoads.push({
        route,
        shipmentCount: items.length,
        totalWeight,
        totalVolume,
        loadType: totalWeight > 15000 ? 'ftl' : 'ltl',
        potentialSavings: this.calculateConsolidationSavings(items.length, totalWeight)
      });
    }

    return consolidatedLoads;
  }

  private calculateConsolidationSavings(shipmentCount: number, totalWeight: number): number {
    const individualCost = shipmentCount * 3500;
    const consolidatedCost = totalWeight > 15000 ? 8500 : 5500;
    return individualCost - consolidatedCost;
  }

  async suggestLoadOptimization(currentLoad: LoadItem[], vehicle: Vehicle): Promise<any> {
    const currentUtilization = currentLoad.reduce((sum, item) => sum + item.weight, 0) / vehicle.capacity;
    
    return {
      currentUtilization: currentUtilization * 100,
      recommendation: currentUtilization < 0.7 ? 'Consider LTL consolidation' : 'Good utilization',
      potentialSavings: currentUtilization < 0.7 ? (0.7 - currentUtilization) * vehicle.capacity * 0.5 : 0,
      suggestedAction: currentUtilization < 0.5 ? 'Wait for more shipments' : 'Proceed with current load'
    };
  }
}

