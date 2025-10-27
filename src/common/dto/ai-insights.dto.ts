import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString, IsArray, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class LogisticsDataDto {
  @ApiProperty({ description: 'Shipment statistics' })
  @IsObject()
  shipments: {
    total: number;
    onTime: number;
    delayed: number;
    cancelled: number;
  };

  @ApiProperty({ description: 'Warehouse utilization data' })
  @IsObject()
  warehouses: {
    utilization: number;
    capacity: number;
    throughput: number;
  };

  @ApiProperty({ description: 'Route performance metrics' })
  @IsObject()
  routes: {
    averageDistance: number;
    averageTime: number;
    fuelEfficiency: number;
  };

  @ApiProperty({ description: 'Customer satisfaction metrics' })
  @IsObject()
  customers: {
    satisfaction: number;
    complaints: number;
    retention: number;
  };

  @ApiProperty({ description: 'Financial metrics', required: false })
  @IsOptional()
  @IsObject()
  financial?: {
    revenue: number;
    costs: number;
    profit: number;
  };

  @ApiProperty({ description: 'Environmental metrics', required: false })
  @IsOptional()
  @IsObject()
  environmental?: {
    carbonFootprint: number;
    fuelConsumption: number;
    emissions: number;
  };
}

export class AIInsightsRequestDto {
  @ApiProperty({ description: 'Logistics data for analysis' })
  @IsObject()
  data: LogisticsDataDto;

  @ApiProperty({ description: 'Analysis type', enum: ['comprehensive', 'performance', 'optimization', 'risk'], required: false })
  @IsOptional()
  @IsEnum(['comprehensive', 'performance', 'optimization', 'risk'])
  analysisType?: string;

  @ApiProperty({ description: 'Include recommendations', required: false })
  @IsOptional()
  @IsNumber()
  includeRecommendations?: boolean;

  @ApiProperty({ description: 'Include risk assessment', required: false })
  @IsOptional()
  @IsNumber()
  includeRiskAssessment?: boolean;

  @ApiProperty({ description: 'Include benchmarking', required: false })
  @IsOptional()
  @IsNumber()
  includeBenchmarking?: boolean;
}

export class AIInsightsResponseDto {
  @ApiProperty({ description: 'Generated insights summary' })
  @IsString()
  summary: string;

  @ApiProperty({ description: 'Key insights identified' })
  @IsArray()
  @IsString({ each: true })
  keyInsights: string[];

  @ApiProperty({ description: 'Performance analysis' })
  performance: {
    overall: 'excellent' | 'good' | 'average' | 'poor';
    metrics: {
      efficiency: number;
      reliability: number;
      costEffectiveness: number;
      customerSatisfaction: number;
    };
    trends: {
      direction: 'improving' | 'stable' | 'declining';
      rate: number;
    };
  };

  @ApiProperty({ description: 'Identified opportunities' })
  @IsArray()
  @IsString({ each: true })
  opportunities: string[];

  @ApiProperty({ description: 'Potential issues' })
  @IsArray()
  @IsString({ each: true })
  issues: string[];

  @ApiProperty({ description: 'Actionable recommendations' })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];

  @ApiProperty({ description: 'Risk assessment' })
  riskAssessment: {
    overall: 'low' | 'medium' | 'high';
    categories: {
      operational: 'low' | 'medium' | 'high';
      financial: 'low' | 'medium' | 'high';
      customer: 'low' | 'medium' | 'high';
      environmental: 'low' | 'medium' | 'high';
    };
    factors: string[];
    mitigation: string[];
  };

  @ApiProperty({ description: 'Benchmarking results', required: false })
  @IsOptional()
  benchmarking?: {
    industryAverage: number;
    topPerformers: number;
    yourPosition: number;
    improvementPotential: number;
  };

  @ApiProperty({ description: 'Analysis metadata' })
  metadata: {
    analysisType: string;
    confidence: number;
    timestamp: string;
    processingTime: number;
    modelVersion: string;
  };
}
