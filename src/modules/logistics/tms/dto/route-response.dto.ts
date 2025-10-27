import { ApiProperty } from '@nestjs/swagger';

export class OptimizedStopDto {
  @ApiProperty({ description: 'Stop ID' })
  id: string;

  @ApiProperty({ description: 'Stop sequence number' })
  sequence: number;

  @ApiProperty({ description: 'Customer name' })
  customerName: string;

  @ApiProperty({ description: 'Address' })
  address: string;

  @ApiProperty({ description: 'Latitude' })
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  longitude: number;

  @ApiProperty({ description: 'Stop type' })
  stopType: string;

  @ApiProperty({ description: 'Estimated arrival time' })
  estimatedArrival: string;

  @ApiProperty({ description: 'Estimated departure time' })
  estimatedDeparture: string;

  @ApiProperty({ description: 'Service duration in minutes' })
  serviceDuration: number;

  @ApiProperty({ description: 'Distance from previous stop in km' })
  distanceFromPrevious: number;

  @ApiProperty({ description: 'Travel time from previous stop in minutes' })
  travelTimeFromPrevious: number;
}

export class RouteOptimizationResultDto {
  @ApiProperty({ description: 'Route ID' })
  routeId: string;

  @ApiProperty({ description: 'Route number' })
  routeNumber: string;

  @ApiProperty({ description: 'Optimized stops', type: [OptimizedStopDto] })
  optimizedStops: OptimizedStopDto[];

  @ApiProperty({ description: 'Total distance in km' })
  totalDistance: number;

  @ApiProperty({ description: 'Total duration in minutes' })
  totalDuration: number;

  @ApiProperty({ description: 'Total stops' })
  totalStops: number;

  @ApiProperty({ description: 'Optimization algorithm used' })
  algorithm: string;

  @ApiProperty({ description: 'Optimization score (0-100)' })
  optimizationScore: number;

  @ApiProperty({ description: 'Time windows violations' })
  timeWindowViolations: number;

  @ApiProperty({ description: 'Capacity violations' })
  capacityViolations: number;

  @ApiProperty({ description: 'Estimated fuel consumption in liters' })
  estimatedFuelConsumption: number;

  @ApiProperty({ description: 'Estimated cost' })
  estimatedCost: number;

  @ApiProperty({ description: 'Route metadata' })
  metadata: {
    createdAt: string;
    optimizedAt: string;
    optimizationTime: number;
    constraints: string[];
  };
}
