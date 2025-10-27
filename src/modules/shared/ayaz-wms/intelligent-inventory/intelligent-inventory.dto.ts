import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsBoolean, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

// Enums
export enum ABCCategory {
  A = 'A',
  B = 'B',
  C = 'C',
}

export enum XYZCategory {
  X = 'X',
  Y = 'Y',
  Z = 'Z',
}

export enum UrgencyLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum AnalysisType {
  ABC_XYZ = 'abc_xyz',
  DEMAND_FORECAST = 'demand_forecast',
  REORDER_ANALYSIS = 'reorder_analysis',
  OPTIMIZATION = 'optimization',
}

// Request DTOs
export class ABCXYZAnalysisDto {
  @ApiProperty({ description: 'Warehouse ID for analysis' })
  @IsString()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Analysis period in days', default: 90, minimum: 30, maximum: 365 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(365)
  analysisPeriod?: number = 90;
}

export class ReorderRecommendationsDto {
  @ApiProperty({ description: 'Warehouse ID for recommendations' })
  @IsString()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Include only critical items', default: false })
  @IsOptional()
  @IsBoolean()
  criticalOnly?: boolean = false;
}

export class DemandForecastDto {
  @ApiProperty({ description: 'Product ID for forecast' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Warehouse ID for forecast' })
  @IsString()
  warehouseId: string;

  @ApiProperty({ description: 'Forecast period in days', minimum: 7, maximum: 365 })
  @IsNumber()
  @Min(7)
  @Max(365)
  forecastDays: number;
}

export class InventoryOptimizationDto {
  @ApiProperty({ description: 'Warehouse ID for optimization' })
  @IsString()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Optimization constraints' })
  @IsOptional()
  constraints?: {
    maxBudget?: number;
    minServiceLevel?: number;
    maxStorageCapacity?: number;
  };
}

// Response DTOs
export class InventoryAnalysisItemDto {
  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Product SKU' })
  sku: string;

  @ApiProperty({ description: 'Product name' })
  productName: string;

  @ApiProperty({ description: 'Current stock level' })
  currentStock: number;

  @ApiProperty({ description: 'ABC category', enum: ABCCategory })
  abcCategory: ABCCategory;

  @ApiProperty({ description: 'XYZ category', enum: XYZCategory })
  xyzCategory: XYZCategory;

  @ApiProperty({ description: 'Demand variability coefficient' })
  demandVariability: number;

  @ApiProperty({ description: 'Lead time in days' })
  leadTime: number;

  @ApiProperty({ description: 'Safety stock level' })
  safetyStock: number;

  @ApiProperty({ description: 'Reorder point' })
  reorderPoint: number;

  @ApiProperty({ description: 'Economic Order Quantity' })
  economicOrderQuantity: number;

  @ApiProperty({ description: 'Stockout risk (0-1)' })
  stockoutRisk: number;

  @ApiProperty({ description: 'Carrying cost per unit' })
  carryingCost: number;

  @ApiProperty({ description: 'Stockout cost per unit' })
  stockoutCost: number;

  @ApiProperty({ description: 'Recommendations', type: [String] })
  recommendations: string[];
}

export class InventoryAnalysisResponseDto {
  @ApiProperty({ description: 'Analysis ID' })
  analysisId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  warehouseId: string;

  @ApiProperty({ description: 'Analysis period in days' })
  analysisPeriod: number;

  @ApiProperty({ description: 'Total products analyzed' })
  totalProducts: number;

  @ApiProperty({ description: 'Analysis results', type: [InventoryAnalysisItemDto] })
  results: InventoryAnalysisItemDto[];

  @ApiProperty({ description: 'Summary statistics' })
  summary: {
    categoryADistribution: number;
    categoryBDistribution: number;
    categoryCDistribution: number;
    averageStockoutRisk: number;
    totalInventoryValue: number;
    optimizationPotential: number;
  };

  @ApiProperty({ description: 'Analysis timestamp' })
  timestamp: Date;
}

export class ReorderRecommendationDto {
  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Product SKU' })
  sku: string;

  @ApiProperty({ description: 'Product name' })
  productName: string;

  @ApiProperty({ description: 'Current stock level' })
  currentStock: number;

  @ApiProperty({ description: 'Reorder point' })
  reorderPoint: number;

  @ApiProperty({ description: 'Recommended order quantity' })
  recommendedQuantity: number;

  @ApiProperty({ description: 'Urgency level', enum: UrgencyLevel })
  urgencyLevel: UrgencyLevel;

  @ApiProperty({ description: 'Expected stockout date' })
  expectedStockoutDate: Date;

  @ApiProperty({ description: 'Cost impact of stockout' })
  costImpact: number;

  @ApiProperty({ description: 'Supplier lead time' })
  supplierLeadTime: number;

  @ApiProperty({ description: 'Recommended action' })
  recommendedAction: string;
}

export class ReorderRecommendationsResponseDto {
  @ApiProperty({ description: 'Warehouse ID' })
  warehouseId: string;

  @ApiProperty({ description: 'Total recommendations' })
  totalRecommendations: number;

  @ApiProperty({ description: 'Critical recommendations' })
  criticalCount: number;

  @ApiProperty({ description: 'High priority recommendations' })
  highPriorityCount: number;

  @ApiProperty({ description: 'Recommendations', type: [ReorderRecommendationDto] })
  recommendations: ReorderRecommendationDto[];

  @ApiProperty({ description: 'Summary' })
  summary: {
    totalCostImpact: number;
    averageUrgency: number;
    recommendedActions: string[];
  };

  @ApiProperty({ description: 'Generated timestamp' })
  timestamp: Date;
}

export class DemandForecastItemDto {
  @ApiProperty({ description: 'Forecast period' })
  period: number;

  @ApiProperty({ description: 'Forecasted demand' })
  forecastedDemand: number;

  @ApiProperty({ description: 'Confidence level (0-1)' })
  confidenceLevel: number;

  @ApiProperty({ description: 'Seasonal factors', type: [Number] })
  seasonalFactors: number[];

  @ApiProperty({ description: 'Trend direction' })
  trendDirection: 'increasing' | 'decreasing' | 'stable';
}

export class DemandForecastResponseDto {
  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  warehouseId: string;

  @ApiProperty({ description: 'Forecast period in days' })
  forecastPeriod: number;

  @ApiProperty({ description: 'Forecast data', type: [DemandForecastItemDto] })
  forecastData: DemandForecastItemDto[];

  @ApiProperty({ description: 'Model accuracy' })
  modelAccuracy: number;

  @ApiProperty({ description: 'Forecast confidence' })
  forecastConfidence: number;

  @ApiProperty({ description: 'Recommendations' })
  recommendations: string[];

  @ApiProperty({ description: 'Generated timestamp' })
  timestamp: Date;
}

export class InventoryOptimizationItemDto {
  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Current inventory level' })
  currentLevel: number;

  @ApiProperty({ description: 'Recommended level' })
  recommendedLevel: number;

  @ApiProperty({ description: 'Potential savings' })
  potentialSavings: number;

  @ApiProperty({ description: 'Recommended action' })
  action: 'increase' | 'decrease' | 'maintain';

  @ApiProperty({ description: 'Reason for recommendation' })
  reason: string;
}

export class InventoryOptimizationResponseDto {
  @ApiProperty({ description: 'Warehouse ID' })
  warehouseId: string;

  @ApiProperty({ description: 'Total potential savings' })
  totalSavings: number;

  @ApiProperty({ description: 'Number of recommendations' })
  recommendationCount: number;

  @ApiProperty({ description: 'Optimization recommendations', type: [InventoryOptimizationItemDto] })
  recommendations: InventoryOptimizationItemDto[];

  @ApiProperty({ description: 'Summary' })
  summary: {
    averageSavings: number;
    highImpactCount: number;
    implementationComplexity: 'low' | 'medium' | 'high';
    estimatedTimeline: string;
  };

  @ApiProperty({ description: 'Generated timestamp' })
  timestamp: Date;
}

// Additional DTOs for specific operations
export class SafetyStockCalculationDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Service level (0-1)', default: 0.95 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  serviceLevel?: number = 0.95;
}

export class EOQCalculationDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Annual demand override' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualDemand?: number;

  @ApiPropertyOptional({ description: 'Ordering cost override' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderingCost?: number;

  @ApiPropertyOptional({ description: 'Holding cost override' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  holdingCost?: number;
}

export class StockoutRiskDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Time horizon in days', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  timeHorizon?: number = 30;
}

export class InventoryAnalyticsDto {
  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Time range in days', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  timeRange?: number = 30;

  @ApiPropertyOptional({ description: 'Include trends', default: true })
  @IsOptional()
  @IsBoolean()
  includeTrends?: boolean = true;

  @ApiPropertyOptional({ description: 'Include forecasts', default: true })
  @IsOptional()
  @IsBoolean()
  includeForecasts?: boolean = true;
}

export class BulkAnalysisDto {
  @ApiProperty({ description: 'Product IDs for analysis', type: [String] })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  warehouseId: string;

  @ApiProperty({ description: 'Analysis type', enum: AnalysisType })
  @IsEnum(AnalysisType)
  analysisType: AnalysisType;
}

export class InventoryAlertDto {
  @ApiProperty({ description: 'Alert ID' })
  alertId: string;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Warehouse ID' })
  warehouseId: string;

  @ApiProperty({ description: 'Alert type' })
  alertType: 'low_stock' | 'high_stock' | 'stockout_risk' | 'excess_inventory' | 'slow_moving';

  @ApiProperty({ description: 'Alert severity' })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Alert message' })
  message: string;

  @ApiProperty({ description: 'Current value' })
  currentValue: number;

  @ApiProperty({ description: 'Threshold value' })
  thresholdValue: number;

  @ApiProperty({ description: 'Recommended action' })
  recommendedAction: string;

  @ApiProperty({ description: 'Alert timestamp' })
  timestamp: Date;
}
