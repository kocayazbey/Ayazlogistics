import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsBoolean, IsObject, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Enums
export enum MetricType {
  EFFICIENCY = 'efficiency',
  PRODUCTIVITY = 'productivity',
  QUALITY = 'quality',
  COST = 'cost',
  CUSTOMER_SATISFACTION = 'customer_satisfaction',
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  STRATEGIC = 'strategic',
}

export enum MetricCategory {
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  CUSTOMER = 'customer',
  EMPLOYEE = 'employee',
  QUALITY = 'quality',
  INNOVATION = 'innovation',
  SUSTAINABILITY = 'sustainability',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TrendDirection {
  IMPROVING = 'improving',
  DECLINING = 'declining',
  STABLE = 'stable',
  VOLATILE = 'volatile',
}

export enum ComparisonType {
  PERIOD_OVER_PERIOD = 'period_over_period',
  YEAR_OVER_YEAR = 'year_over_year',
  BENCHMARK = 'benchmark',
  TARGET = 'target',
  PEER = 'peer',
}

export enum ForecastType {
  SHORT_TERM = 'short_term',
  MEDIUM_TERM = 'medium_term',
  LONG_TERM = 'long_term',
  SEASONAL = 'seasonal',
}

// Request DTOs
export class PerformanceMetricsRequestDto {
  @ApiProperty({ description: 'Time range in days' })
  @IsNumber()
  @Min(1)
  @Max(365)
  timeRange: number;

  @ApiPropertyOptional({ description: 'Department filter' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Metric type filter', enum: MetricType })
  @IsOptional()
  @IsEnum(MetricType)
  metricType?: MetricType;

  @ApiPropertyOptional({ description: 'Include trends', default: true })
  @IsOptional()
  @IsBoolean()
  includeTrends?: boolean = true;

  @ApiPropertyOptional({ description: 'Include forecasts', default: true })
  @IsOptional()
  @IsBoolean()
  includeForecasts?: boolean = true;

  @ApiPropertyOptional({ description: 'Include benchmarks', default: true })
  @IsOptional()
  @IsBoolean()
  includeBenchmarks?: boolean = true;
}

// Response DTOs
export class KPIDto {
  @ApiProperty({ description: 'KPI ID' })
  id: string;

  @ApiProperty({ description: 'KPI name' })
  name: string;

  @ApiProperty({ description: 'KPI description' })
  description: string;

  @ApiProperty({ description: 'KPI category', enum: MetricCategory })
  category: MetricCategory;

  @ApiProperty({ description: 'Current value' })
  currentValue: number;

  @ApiProperty({ description: 'Target value' })
  targetValue: number;

  @ApiProperty({ description: 'Previous value' })
  previousValue: number;

  @ApiProperty({ description: 'Change percentage' })
  changePercentage: number;

  @ApiProperty({ description: 'Trend direction', enum: TrendDirection })
  trendDirection: TrendDirection;

  @ApiProperty({ description: 'Performance status' })
  status: string;

  @ApiProperty({ description: 'KPI unit' })
  unit: string;

  @ApiProperty({ description: 'KPI frequency' })
  frequency: string;

  @ApiProperty({ description: 'KPI owner' })
  owner: string;

  @ApiProperty({ description: 'KPI stakeholders' })
  stakeholders: string[];

  @ApiProperty({ description: 'KPI last updated' })
  lastUpdated: Date;
}

export class DashboardDto {
  @ApiProperty({ description: 'Dashboard ID' })
  id: string;

  @ApiProperty({ description: 'Dashboard name' })
  name: string;

  @ApiProperty({ description: 'Dashboard description' })
  description: string;

  @ApiProperty({ description: 'Dashboard type' })
  type: string;

  @ApiProperty({ description: 'Dashboard widgets' })
  widgets: Array<{
    id: string;
    type: string;
    title: string;
    data: any;
    position: { x: number; y: number; width: number; height: number };
  }>;

  @ApiProperty({ description: 'Dashboard layout' })
  layout: {
    columns: number;
    rows: number;
    gridSize: number;
  };

  @ApiProperty({ description: 'Dashboard filters' })
  filters: Array<{
    name: string;
    type: string;
    options: string[];
    defaultValue: any;
  }>;

  @ApiProperty({ description: 'Dashboard refresh interval' })
  refreshInterval: number;

  @ApiProperty({ description: 'Dashboard permissions' })
  permissions: {
    view: string[];
    edit: string[];
    admin: string[];
  };

  @ApiProperty({ description: 'Dashboard created by' })
  createdBy: string;

  @ApiProperty({ description: 'Dashboard created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Dashboard updated at' })
  updatedAt: Date;
}

export class ReportDto {
  @ApiProperty({ description: 'Report ID' })
  id: string;

  @ApiProperty({ description: 'Report name' })
  name: string;

  @ApiProperty({ description: 'Report description' })
  description: string;

  @ApiProperty({ description: 'Report type' })
  type: string;

  @ApiProperty({ description: 'Report period' })
  period: {
    start: Date;
    end: Date;
  };

  @ApiProperty({ description: 'Report summary' })
  summary: {
    totalMetrics: number;
    improvedMetrics: number;
    declinedMetrics: number;
    stableMetrics: number;
    overallScore: number;
    keyInsights: string[];
  };

  @ApiProperty({ description: 'Report details' })
  details: {
    metrics: any[];
    trends: any[];
    comparisons: any[];
    recommendations: string[];
  };

  @ApiProperty({ description: 'Report status' })
  status: string;

  @ApiProperty({ description: 'Report generated by' })
  generatedBy: string;

  @ApiProperty({ description: 'Report generated at' })
  generatedAt: Date;
}

export class AlertDto {
  @ApiProperty({ description: 'Alert ID' })
  id: string;

  @ApiProperty({ description: 'Alert type' })
  type: string;

  @ApiProperty({ description: 'Alert severity', enum: AlertSeverity })
  severity: AlertSeverity;

  @ApiProperty({ description: 'Alert message' })
  message: string;

  @ApiProperty({ description: 'Alert description' })
  description: string;

  @ApiProperty({ description: 'Related metric' })
  metric: string;

  @ApiProperty({ description: 'Alert status', enum: AlertStatus })
  status: AlertStatus;

  @ApiProperty({ description: 'Alert timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Alert acknowledged by' })
  acknowledgedBy: string;

  @ApiProperty({ description: 'Alert acknowledged at' })
  acknowledgedAt: Date;

  @ApiProperty({ description: 'Alert resolved by' })
  resolvedBy: string;

  @ApiProperty({ description: 'Alert resolved at' })
  resolvedAt: Date;

  @ApiProperty({ description: 'Alert resolution' })
  resolution: string;

  @ApiProperty({ description: 'Alert actions' })
  actions: string[];
}

export class BenchmarkDto {
  @ApiProperty({ description: 'Benchmark ID' })
  id: string;

  @ApiProperty({ description: 'Benchmark name' })
  name: string;

  @ApiProperty({ description: 'Benchmark description' })
  description: string;

  @ApiProperty({ description: 'Benchmark category' })
  category: string;

  @ApiProperty({ description: 'Benchmark industry' })
  industry: string;

  @ApiProperty({ description: 'Benchmark company size' })
  companySize: string;

  @ApiProperty({ description: 'Benchmark value' })
  value: number;

  @ApiProperty({ description: 'Benchmark unit' })
  unit: string;

  @ApiProperty({ description: 'Benchmark percentile' })
  percentile: number;

  @ApiProperty({ description: 'Benchmark source' })
  source: string;

  @ApiProperty({ description: 'Benchmark date' })
  date: Date;

  @ApiProperty({ description: 'Benchmark confidence' })
  confidence: number;
}

export class TrendDto {
  @ApiProperty({ description: 'Trend ID' })
  id: string;

  @ApiProperty({ description: 'Trend metric' })
  metric: string;

  @ApiProperty({ description: 'Trend period' })
  period: {
    start: Date;
    end: Date;
  };

  @ApiProperty({ description: 'Trend data' })
  data: Array<{
    date: Date;
    value: number;
    change: number;
    changePercentage: number;
  }>;

  @ApiProperty({ description: 'Trend direction', enum: TrendDirection })
  direction: TrendDirection;

  @ApiProperty({ description: 'Trend magnitude' })
  magnitude: number;

  @ApiProperty({ description: 'Trend significance' })
  significance: string;

  @ApiProperty({ description: 'Trend forecast' })
  forecast: {
    nextValue: number;
    confidence: number;
    range: { min: number; max: number };
  };
}

export class ComparisonDto {
  @ApiProperty({ description: 'Comparison ID' })
  id: string;

  @ApiProperty({ description: 'Comparison type', enum: ComparisonType })
  type: ComparisonType;

  @ApiProperty({ description: 'Comparison metric' })
  metric: string;

  @ApiProperty({ description: 'Comparison periods' })
  periods: {
    current: {
      start: Date;
      end: Date;
      value: number;
    };
    previous: {
      start: Date;
      end: Date;
      value: number;
    };
  };

  @ApiProperty({ description: 'Comparison result' })
  result: {
    change: number;
    changePercentage: number;
    direction: string;
    significance: string;
  };

  @ApiProperty({ description: 'Comparison insights' })
  insights: string[];

  @ApiProperty({ description: 'Comparison recommendations' })
  recommendations: string[];
}

export class ForecastDto {
  @ApiProperty({ description: 'Forecast ID' })
  id: string;

  @ApiProperty({ description: 'Forecast metric' })
  metric: string;

  @ApiProperty({ description: 'Forecast type', enum: ForecastType })
  type: ForecastType;

  @ApiProperty({ description: 'Forecast period' })
  period: {
    start: Date;
    end: Date;
  };

  @ApiProperty({ description: 'Forecast data' })
  data: Array<{
    date: Date;
    value: number;
    confidence: number;
    range: { min: number; max: number };
  }>;

  @ApiProperty({ description: 'Forecast accuracy' })
  accuracy: {
    historical: number;
    predicted: number;
    confidence: number;
  };

  @ApiProperty({ description: 'Forecast assumptions' })
  assumptions: string[];

  @ApiProperty({ description: 'Forecast limitations' })
  limitations: string[];
}

export class PerformanceMetricsResponseDto {
  @ApiProperty({ description: 'Performance metrics' })
  metrics: {
    efficiency: {
      overall: number;
      byDepartment: Array<{
        department: string;
        score: number;
        trend: string;
      }>;
    };
    productivity: {
      overall: number;
      byTeam: Array<{
        team: string;
        score: number;
        trend: string;
      }>;
    };
    quality: {
      overall: number;
      byProcess: Array<{
        process: string;
        score: number;
        trend: string;
      }>;
    };
    cost: {
      overall: number;
      byCategory: Array<{
        category: string;
        amount: number;
        trend: string;
      }>;
    };
    customerSatisfaction: {
      overall: number;
      bySegment: Array<{
        segment: string;
        score: number;
        trend: string;
      }>;
    };
    financial: {
      revenue: number;
      profit: number;
      margin: number;
      trend: string;
    };
    operational: {
      throughput: number;
      utilization: number;
      availability: number;
      trend: string;
    };
  };

  @ApiProperty({ description: 'Key performance indicators', type: [KPIDto] })
  kpis: KPIDto[];

  @ApiProperty({ description: 'Performance trends', type: [TrendDto] })
  trends: TrendDto[];

  @ApiProperty({ description: 'Performance comparisons', type: [ComparisonDto] })
  comparisons: ComparisonDto[];

  @ApiProperty({ description: 'Performance forecasts', type: [ForecastDto] })
  forecasts: ForecastDto[];

  @ApiProperty({ description: 'Performance alerts', type: [AlertDto] })
  alerts: AlertDto[];

  @ApiProperty({ description: 'Performance benchmarks', type: [BenchmarkDto] })
  benchmarks: BenchmarkDto[];

  @ApiProperty({ description: 'Performance summary' })
  summary: {
    overallScore: number;
    improvementAreas: string[];
    strengths: string[];
    recommendations: string[];
    nextSteps: string[];
  };

  @ApiProperty({ description: 'Performance timestamp' })
  timestamp: Date;
}

// Additional DTOs
export class MetricDto {
  @ApiProperty({ description: 'Metric ID' })
  id: string;

  @ApiProperty({ description: 'Metric name' })
  name: string;

  @ApiProperty({ description: 'Metric description' })
  description: string;

  @ApiProperty({ description: 'Metric type', enum: MetricType })
  type: MetricType;

  @ApiProperty({ description: 'Metric category', enum: MetricCategory })
  category: MetricCategory;

  @ApiProperty({ description: 'Metric value' })
  value: number;

  @ApiProperty({ description: 'Metric unit' })
  unit: string;

  @ApiProperty({ description: 'Metric frequency' })
  frequency: string;

  @ApiProperty({ description: 'Metric owner' })
  owner: string;

  @ApiProperty({ description: 'Metric stakeholders' })
  stakeholders: string[];

  @ApiProperty({ description: 'Metric last updated' })
  lastUpdated: Date;
}

export class EfficiencyMetricDto {
  @ApiProperty({ description: 'Efficiency score' })
  score: number;

  @ApiProperty({ description: 'Efficiency trend' })
  trend: string;

  @ApiProperty({ description: 'Efficiency by department' })
  byDepartment: Array<{
    department: string;
    score: number;
    trend: string;
  }>;

  @ApiProperty({ description: 'Efficiency by process' })
  byProcess: Array<{
    process: string;
    score: number;
    trend: string;
  }>;

  @ApiProperty({ description: 'Efficiency recommendations' })
  recommendations: string[];
}

export class ProductivityMetricDto {
  @ApiProperty({ description: 'Productivity score' })
  score: number;

  @ApiProperty({ description: 'Productivity trend' })
  trend: string;

  @ApiProperty({ description: 'Productivity by team' })
  byTeam: Array<{
    team: string;
    score: number;
    trend: string;
  }>;

  @ApiProperty({ description: 'Productivity by role' })
  byRole: Array<{
    role: string;
    score: number;
    trend: string;
  }>;

  @ApiProperty({ description: 'Productivity recommendations' })
  recommendations: string[];
}

export class QualityMetricDto {
  @ApiProperty({ description: 'Quality score' })
  score: number;

  @ApiProperty({ description: 'Quality trend' })
  trend: string;

  @ApiProperty({ description: 'Quality by process' })
  byProcess: Array<{
    process: string;
    score: number;
    trend: string;
  }>;

  @ApiProperty({ description: 'Quality by product' })
  byProduct: Array<{
    product: string;
    score: number;
    trend: string;
  }>;

  @ApiProperty({ description: 'Quality recommendations' })
  recommendations: string[];
}

export class CostMetricDto {
  @ApiProperty({ description: 'Total cost' })
  totalCost: number;

  @ApiProperty({ description: 'Cost trend' })
  trend: string;

  @ApiProperty({ description: 'Cost by category' })
  byCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
    trend: string;
  }>;

  @ApiProperty({ description: 'Cost by department' })
  byDepartment: Array<{
    department: string;
    amount: number;
    percentage: number;
    trend: string;
  }>;

  @ApiProperty({ description: 'Cost recommendations' })
  recommendations: string[];
}

export class CustomerSatisfactionMetricDto {
  @ApiProperty({ description: 'Overall satisfaction score' })
  overallScore: number;

  @ApiProperty({ description: 'Satisfaction trend' })
  trend: string;

  @ApiProperty({ description: 'Satisfaction by segment' })
  bySegment: Array<{
    segment: string;
    score: number;
    trend: string;
  }>;

  @ApiProperty({ description: 'Satisfaction by service' })
  byService: Array<{
    service: string;
    score: number;
    trend: string;
  }>;

  @ApiProperty({ description: 'Satisfaction recommendations' })
  recommendations: string[];
}

export class FinancialMetricDto {
  @ApiProperty({ description: 'Revenue' })
  revenue: number;

  @ApiProperty({ description: 'Profit' })
  profit: number;

  @ApiProperty({ description: 'Margin' })
  margin: number;

  @ApiProperty({ description: 'Financial trend' })
  trend: string;

  @ApiProperty({ description: 'Financial by period' })
  byPeriod: Array<{
    period: string;
    revenue: number;
    profit: number;
    margin: number;
  }>;

  @ApiProperty({ description: 'Financial recommendations' })
  recommendations: string[];
}

export class OperationalMetricDto {
  @ApiProperty({ description: 'Throughput' })
  throughput: number;

  @ApiProperty({ description: 'Utilization' })
  utilization: number;

  @ApiProperty({ description: 'Availability' })
  availability: number;

  @ApiProperty({ description: 'Operational trend' })
  trend: string;

  @ApiProperty({ description: 'Operational by process' })
  byProcess: Array<{
    process: string;
    throughput: number;
    utilization: number;
    availability: number;
  }>;

  @ApiProperty({ description: 'Operational recommendations' })
  recommendations: string[];
}

export class InsightDto {
  @ApiProperty({ description: 'Insight ID' })
  id: string;

  @ApiProperty({ description: 'Insight title' })
  title: string;

  @ApiProperty({ description: 'Insight description' })
  description: string;

  @ApiProperty({ description: 'Insight category' })
  category: string;

  @ApiProperty({ description: 'Insight impact' })
  impact: string;

  @ApiProperty({ description: 'Insight confidence' })
  confidence: number;

  @ApiProperty({ description: 'Insight metrics' })
  metrics: string[];

  @ApiProperty({ description: 'Insight recommendations' })
  recommendations: string[];

  @ApiProperty({ description: 'Insight timestamp' })
  timestamp: Date;
}

export class RecommendationDto {
  @ApiProperty({ description: 'Recommendation ID' })
  id: string;

  @ApiProperty({ description: 'Recommendation title' })
  title: string;

  @ApiProperty({ description: 'Recommendation description' })
  description: string;

  @ApiProperty({ description: 'Recommendation category' })
  category: string;

  @ApiProperty({ description: 'Recommendation priority' })
  priority: string;

  @ApiProperty({ description: 'Recommendation impact' })
  impact: string;

  @ApiProperty({ description: 'Recommendation effort' })
  effort: string;

  @ApiProperty({ description: 'Recommendation timeline' })
  timeline: string;

  @ApiProperty({ description: 'Recommendation owner' })
  owner: string;

  @ApiProperty({ description: 'Recommendation status' })
  status: string;

  @ApiProperty({ description: 'Recommendation metrics' })
  metrics: string[];

  @ApiProperty({ description: 'Recommendation actions' })
  actions: string[];

  @ApiProperty({ description: 'Recommendation timestamp' })
  timestamp: Date;
}
