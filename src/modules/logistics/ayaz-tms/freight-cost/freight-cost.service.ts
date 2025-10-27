import { Injectable } from '@nestjs/common';

@Injectable()
export class FreightCostService {
  async calculateFreightCost(data: {
    distance: number;
    weight: number;
    volumeweight?: number;
    fuelSurcharge?: number;
  }) {
    const baseCost = data.distance * 2.5;
    const weightCost = data.weight * 0.5;
    const fuelSurcharge = data.fuelSurcharge || baseCost * 0.15;

    const totalCost = baseCost + weightCost + fuelSurcharge;

    return {
      baseCost,
      weightCost,
      fuelSurcharge,
      totalCost,
      currency: 'TRY',
    };
  }

  async calculateRouteFreightCost(routeId: string, stops: any[]) {
    let totalDistance = 0;
    let totalWeight = 0;

    for (const stop of stops) {
      totalWeight += stop.weight || 0;
    }

    const cost = await this.calculateFreightCost({
      distance: totalDistance,
      weight: totalWeight,
    });

    return {
      routeId,
      stops: stops.length,
      ...cost,
    };
  }
}
