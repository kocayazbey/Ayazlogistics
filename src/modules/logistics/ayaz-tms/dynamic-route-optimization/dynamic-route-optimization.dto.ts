import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsBoolean, IsObject, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Enums
export enum VehicleType {
  TRUCK = 'truck',
  VAN = 'van',
  AIRCRAFT = 'aircraft',
  SHIP = 'ship',
  TRAIN = 'train',
}

export enum FuelType {
  DIESEL = 'diesel',
  GASOLINE = 'gasoline',
  ELECTRIC = 'electric',
  HYBRID = 'hybrid',
}

export enum OptimizationAlgorithm {
  GENETIC = 'genetic',
  SIMULATED_ANNEALING = 'simulated_annealing',
  ANT_COLONY = 'ant_colony',
  NEAREST_NEIGHBOR = 'nearest_neighbor',
  SAVINGS = 'savings',
}

export enum RouteType {
  DOMESTIC = 'domestic',
  INTERNATIONAL = 'international',
  CROSS_BORDER = 'cross_border',
}

export enum WeatherCondition {
  GOOD = 'good',
  MODERATE = 'moderate',
  POOR = 'poor',
  SEVERE = 'severe',
}

export enum PoliticalStability {
  STABLE = 'stable',
  MODERATE = 'moderate',
  UNSTABLE = 'unstable',
}

export enum EconomicCondition {
  GOOD = 'good',
  MODERATE = 'moderate',
  POOR = 'poor',
}

// Request DTOs
export class LocationDto {
  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Address' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Time window start' })
  @IsString()
  timeWindowStart: string;

  @ApiProperty({ description: 'Time window end' })
  @IsString()
  timeWindowEnd: string;
}

export class DestinationDto {
  @ApiProperty({ description: 'Destination ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Address' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Priority level', enum: ['high', 'medium', 'low'] })
  @IsEnum(['high', 'medium', 'low'])
  priority: string;

  @ApiProperty({ description: 'Time window start' })
  @IsString()
  timeWindowStart: string;

  @ApiProperty({ description: 'Time window end' })
  @IsString()
  timeWindowEnd: string;

  @ApiProperty({ description: 'Service time in minutes' })
  @IsNumber()
  @Min(0)
  serviceTime: number;

  @ApiProperty({ description: 'Weight in kg' })
  @IsNumber()
  @Min(0)
  weight: number;

  @ApiProperty({ description: 'Volume in m³' })
  @IsNumber()
  @Min(0)
  volume: number;

  @ApiProperty({ description: 'Special requirements', type: [String] })
  @IsArray()
  @IsString({ each: true })
  specialRequirements: string[];
}

export class VehicleDto {
  @ApiProperty({ description: 'Vehicle ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Capacity in kg' })
  @IsNumber()
  @Min(0)
  capacity: number;

  @ApiProperty({ description: 'Volume capacity in m³' })
  @IsNumber()
  @Min(0)
  volumeCapacity: number;

  @ApiProperty({ description: 'Fuel type', enum: FuelType })
  @IsEnum(FuelType)
  fuelType: FuelType;

  @ApiProperty({ description: 'Current location' })
  @ValidateNested()
  @Type(() => LocationDto)
  currentLocation: LocationDto;

  @ApiProperty({ description: 'Driver ID' })
  @IsString()
  driverId: string;

  @ApiProperty({ description: 'Driver skills', type: [String] })
  @IsArray()
  @IsString({ each: true })
  driverSkills: string[];
}

export class ConstraintsDto {
  @ApiPropertyOptional({ description: 'Maximum route duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRouteDuration?: number;

  @ApiPropertyOptional({ description: 'Maximum distance in km' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDistance?: number;

  @ApiPropertyOptional({ description: 'Avoid tolls' })
  @IsOptional()
  @IsBoolean()
  avoidTolls?: boolean;

  @ApiPropertyOptional({ description: 'Avoid highways' })
  @IsOptional()
  @IsBoolean()
  avoidHighways?: boolean;

  @ApiPropertyOptional({ description: 'Prefer electric charging stations' })
  @IsOptional()
  @IsBoolean()
  preferElectricCharging?: boolean;
}

export class RealTimeFactorsDto {
  @ApiPropertyOptional({ description: 'Include traffic data' })
  @IsOptional()
  @IsBoolean()
  includeTraffic?: boolean;

  @ApiPropertyOptional({ description: 'Include weather data' })
  @IsOptional()
  @IsBoolean()
  includeWeather?: boolean;

  @ApiPropertyOptional({ description: 'Include fuel prices' })
  @IsOptional()
  @IsBoolean()
  includeFuelPrices?: boolean;

  @ApiPropertyOptional({ description: 'Include time of day factors' })
  @IsOptional()
  @IsBoolean()
  includeTimeOfDay?: boolean;
}

export class RouteOptimizationRequestDto {
  @ApiProperty({ description: 'Origin location' })
  @ValidateNested()
  @Type(() => LocationDto)
  origin: LocationDto;

  @ApiProperty({ description: 'Destination locations', type: [DestinationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DestinationDto)
  destinations: DestinationDto[];

  @ApiProperty({ description: 'Vehicle details' })
  @ValidateNested()
  @Type(() => VehicleDto)
  vehicle: VehicleDto;

  @ApiPropertyOptional({ description: 'Route constraints' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConstraintsDto)
  constraints?: ConstraintsDto;

  @ApiPropertyOptional({ description: 'Real-time factors' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RealTimeFactorsDto)
  realTimeFactors?: RealTimeFactorsDto;
}

// Response DTOs
export class RouteStopDto {
  @ApiProperty({ description: 'Destination ID' })
  destinationId: string;

  @ApiProperty({ description: 'Arrival time' })
  arrivalTime: Date;

  @ApiProperty({ description: 'Departure time' })
  departureTime: Date;

  @ApiProperty({ description: 'Service time in minutes' })
  serviceTime: number;

  @ApiProperty({ description: 'Waiting time in minutes' })
  waitingTime: number;

  @ApiProperty({ description: 'Distance from previous stop in km' })
  distanceFromPrevious: number;

  @ApiProperty({ description: 'Estimated cost' })
  estimatedCost: number;
}

export class RouteOptimizationDto {
  @ApiProperty({ description: 'Vehicle ID' })
  vehicleId: string;

  @ApiProperty({ description: 'Driver ID' })
  driverId: string;

  @ApiProperty({ description: 'Total distance in km' })
  totalDistance: number;

  @ApiProperty({ description: 'Total duration in minutes' })
  totalDuration: number;

  @ApiProperty({ description: 'Total cost' })
  totalCost: number;

  @ApiProperty({ description: 'Fuel consumption in liters' })
  fuelConsumption: number;

  @ApiProperty({ description: 'CO2 emissions in kg' })
  co2Emissions: number;

  @ApiProperty({ description: 'Route stops', type: [RouteStopDto] })
  stops: RouteStopDto[];

  @ApiProperty({ description: 'Optimization metrics' })
  optimization: {
    efficiency: number;
    feasibility: number;
    costSavings: number;
    timeSavings: number;
  };
}

export class RouteOptimizationResponseDto {
  @ApiProperty({ description: 'Optimized routes', type: [RouteOptimizationDto] })
  routes: RouteOptimizationDto[];

  @ApiProperty({ description: 'Summary statistics' })
  summary: {
    totalRoutes: number;
    totalDistance: number;
    totalDuration: number;
    totalCost: number;
    averageEfficiency: number;
    unassignedDestinations: string[];
    recommendations: string[];
  };
}

export class TrafficDataDto {
  @ApiProperty({ description: 'Congestion level (0-1)' })
  congestionLevel: number;

  @ApiProperty({ description: 'Average speed in km/h' })
  averageSpeed: number;

  @ApiProperty({ description: 'Traffic incidents' })
  incidents: Array<{
    type: string;
    severity: string;
    location: LocationDto;
    description: string;
    estimatedDuration: number;
  }>;
}

export class WeatherDataDto {
  @ApiProperty({ description: 'Temperature in °C' })
  temperature: number;

  @ApiProperty({ description: 'Humidity percentage' })
  humidity: number;

  @ApiProperty({ description: 'Wind speed in km/h' })
  windSpeed: number;

  @ApiProperty({ description: 'Precipitation in mm/h' })
  precipitation: number;

  @ApiProperty({ description: 'Visibility in km' })
  visibility: number;

  @ApiProperty({ description: 'Road conditions' })
  roadConditions: string;

  @ApiProperty({ description: 'Weather warnings', type: [String] })
  weatherWarnings: string[];
}

export class FuelPricesDto {
  @ApiProperty({ description: 'Diesel price per liter' })
  diesel: number;

  @ApiProperty({ description: 'Gasoline price per liter' })
  gasoline: number;

  @ApiProperty({ description: 'Electric price per kWh' })
  electric: number;
}

export class TimeFactorsDto {
  @ApiProperty({ description: 'Is rush hour' })
  isRushHour: boolean;

  @ApiProperty({ description: 'Is weekend' })
  isWeekend: boolean;

  @ApiProperty({ description: 'Is holiday' })
  isHoliday: boolean;

  @ApiProperty({ description: 'Traffic multiplier' })
  trafficMultiplier: number;
}

export class RealTimeDataDto {
  @ApiProperty({ description: 'Traffic data' })
  traffic: TrafficDataDto;

  @ApiProperty({ description: 'Weather data' })
  weather: WeatherDataDto;

  @ApiProperty({ description: 'Fuel prices' })
  fuelPrices: FuelPricesDto;

  @ApiProperty({ description: 'Time factors' })
  timeFactors: TimeFactorsDto;
}

export class RouteHistoryDto {
  @ApiProperty({ description: 'Route ID' })
  routeId: string;

  @ApiProperty({ description: 'Historical performance data' })
  performance: Array<{
    date: Date;
    duration: number;
    distance: number;
    cost: number;
    efficiency: number;
    delays: number;
    incidents: number;
  }>;

  @ApiProperty({ description: 'Average metrics' })
  averages: {
    duration: number;
    distance: number;
    cost: number;
    efficiency: number;
  };

  @ApiProperty({ description: 'Trend analysis' })
  trends: {
    durationTrend: string;
    costTrend: string;
    efficiencyTrend: string;
  };
}

export class RoutePerformanceDto {
  @ApiProperty({ description: 'Performance metrics' })
  metrics: {
    onTimeDelivery: number;
    averageDuration: number;
    averageCost: number;
    fuelEfficiency: number;
    customerSatisfaction: number;
  };

  @ApiProperty({ description: 'Comparative analysis' })
  comparison: {
    vsIndustryAverage: number;
    vsPreviousPeriod: number;
    vsBestPerforming: number;
  };

  @ApiProperty({ description: 'Improvement recommendations' })
  recommendations: string[];
}

export class RouteComparisonDto {
  @ApiProperty({ description: 'Route options', type: [RouteOptimizationDto] })
  routes: RouteOptimizationDto[];

  @ApiProperty({ description: 'Comparison criteria' })
  criteria: string[];

  @ApiProperty({ description: 'Best route recommendation' })
  bestRoute: {
    routeId: string;
    score: number;
    reasons: string[];
  };

  @ApiProperty({ description: 'Detailed comparison' })
  detailedComparison: Array<{
    criterion: string;
    scores: Record<string, number>;
    winner: string;
  }>;
}

export class RouteValidationDto {
  @ApiProperty({ description: 'Validation result' })
  isValid: boolean;

  @ApiProperty({ description: 'Validation errors', type: [String] })
  errors: string[];

  @ApiProperty({ description: 'Validation warnings', type: [String] })
  warnings: string[];

  @ApiProperty({ description: 'Constraint violations' })
  violations: Array<{
    constraint: string;
    severity: string;
    message: string;
  }>;

  @ApiProperty({ description: 'Feasibility score (0-1)' })
  feasibilityScore: number;
}

export class RouteSimulationDto {
  @ApiProperty({ description: 'Simulation results' })
  results: Array<{
    scenario: string;
    duration: number;
    cost: number;
    efficiency: number;
    risk: number;
    probability: number;
  }>;

  @ApiProperty({ description: 'Best scenario' })
  bestScenario: {
    scenario: string;
    score: number;
    reasons: string[];
  };

  @ApiProperty({ description: 'Risk analysis' })
  riskAnalysis: {
    highRiskScenarios: string[];
    mitigationStrategies: string[];
    contingencyPlans: string[];
  };
}

// Additional DTOs
export class AlgorithmInfoDto {
  @ApiProperty({ description: 'Algorithm name' })
  name: string;

  @ApiProperty({ description: 'Algorithm description' })
  description: string;

  @ApiProperty({ description: 'Best use cases' })
  bestUseCases: string[];

  @ApiProperty({ description: 'Performance characteristics' })
  performance: {
    speed: string;
    accuracy: string;
    scalability: string;
  };

  @ApiProperty({ description: 'Parameters' })
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    defaultValue: any;
  }>;
}

export class ConstraintInfoDto {
  @ApiProperty({ description: 'Constraint name' })
  name: string;

  @ApiProperty({ description: 'Constraint description' })
  description: string;

  @ApiProperty({ description: 'Constraint type' })
  type: string;

  @ApiProperty({ description: 'Default value' })
  defaultValue: any;

  @ApiProperty({ description: 'Possible values' })
  possibleValues: any[];
}

export class FuelPriceDto {
  @ApiProperty({ description: 'Region' })
  region: string;

  @ApiProperty({ description: 'Fuel prices' })
  prices: FuelPricesDto;

  @ApiProperty({ description: 'Price trend' })
  trend: {
    direction: string;
    percentage: number;
    period: string;
  };

  @ApiProperty({ description: 'Last updated' })
  lastUpdated: Date;
}

export class TrafficConditionDto {
  @ApiProperty({ description: 'Region' })
  region: string;

  @ApiProperty({ description: 'Current conditions' })
  conditions: TrafficDataDto;

  @ApiProperty({ description: 'Predicted conditions' })
  predictions: Array<{
    time: Date;
    congestionLevel: number;
    averageSpeed: number;
  }>;

  @ApiProperty({ description: 'Last updated' })
  lastUpdated: Date;
}

export class WeatherConditionDto {
  @ApiProperty({ description: 'Location' })
  location: LocationDto;

  @ApiProperty({ description: 'Current weather' })
  current: WeatherDataDto;

  @ApiProperty({ description: 'Forecast' })
  forecast: Array<{
    time: Date;
    temperature: number;
    precipitation: number;
    windSpeed: number;
    roadConditions: string;
  }>;

  @ApiProperty({ description: 'Last updated' })
  lastUpdated: Date;
}

export class RouteRecommendationDto {
  @ApiProperty({ description: 'Route ID' })
  routeId: string;

  @ApiProperty({ description: 'Route name' })
  name: string;

  @ApiProperty({ description: 'Route description' })
  description: string;

  @ApiProperty({ description: 'Route performance score' })
  score: number;

  @ApiProperty({ description: 'Route characteristics' })
  characteristics: {
    duration: number;
    distance: number;
    cost: number;
    efficiency: number;
    reliability: number;
  };

  @ApiProperty({ description: 'Usage statistics' })
  usage: {
    timesUsed: number;
    successRate: number;
    averageRating: number;
  };

  @ApiProperty({ description: 'Recommendation reasons' })
  reasons: string[];
}

export class SavedRouteDto {
  @ApiProperty({ description: 'Route ID' })
  id: string;

  @ApiProperty({ description: 'Route name' })
  name: string;

  @ApiProperty({ description: 'Route description' })
  description: string;

  @ApiProperty({ description: 'Route data' })
  routeData: any;

  @ApiProperty({ description: 'Created by' })
  createdBy: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last used' })
  lastUsed: Date;

  @ApiProperty({ description: 'Usage count' })
  usageCount: number;
}
