import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsBoolean, IsObject, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Enums
export enum RiskType {
  OPERATIONAL = 'operational',
  FINANCIAL = 'financial',
  STRATEGIC = 'strategic',
  COMPLIANCE = 'compliance',
  REPUTATIONAL = 'reputational',
  CYBERSECURITY = 'cybersecurity',
  SUPPLY_CHAIN = 'supply_chain',
  MARKET = 'market',
  CREDIT = 'credit',
  LIQUIDITY = 'liquidity',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RiskStatus {
  IDENTIFIED = 'identified',
  ASSESSED = 'assessed',
  MITIGATED = 'mitigated',
  MONITORED = 'monitored',
  CLOSED = 'closed',
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

export enum ScenarioType {
  STRESS_TEST = 'stress_test',
  SCENARIO_ANALYSIS = 'scenario_analysis',
  MONTE_CARLO = 'monte_carlo',
  SENSITIVITY = 'sensitivity',
}

export enum CoverageType {
  GENERAL_LIABILITY = 'general_liability',
  PROFESSIONAL_LIABILITY = 'professional_liability',
  CYBER_LIABILITY = 'cyber_liability',
  DIRECTORS_OFFICERS = 'directors_officers',
  EMPLOYMENT_PRACTICES = 'employment_practices',
  PROPERTY = 'property',
  BUSINESS_INTERRUPTION = 'business_interruption',
}

// Request DTOs
export class RiskAssessmentRequestDto {
  @ApiProperty({ description: 'Risk assessment type', enum: RiskType })
  @IsEnum(RiskType)
  riskType: RiskType;

  @ApiProperty({ description: 'Assessment scope' })
  @IsObject()
  scope: {
    departments: string[];
    processes: string[];
    assets: string[];
    timeRange: {
      start: Date;
      end: Date;
    };
  };

  @ApiPropertyOptional({ description: 'Include historical data', default: true })
  @IsOptional()
  @IsBoolean()
  includeHistorical?: boolean = true;

  @ApiPropertyOptional({ description: 'Include predictive analysis', default: true })
  @IsOptional()
  @IsBoolean()
  includePredictive?: boolean = true;

  @ApiPropertyOptional({ description: 'Include mitigation recommendations', default: true })
  @IsOptional()
  @IsBoolean()
  includeMitigation?: boolean = true;
}

export class RiskPolicyDto {
  @ApiProperty({ description: 'Policy name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Policy description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Policy type', enum: RiskType })
  @IsEnum(RiskType)
  type: RiskType;

  @ApiProperty({ description: 'Policy rules' })
  @IsObject()
  rules: {
    thresholds: {
      riskLevel: RiskLevel;
      value: number;
    }[];
    actions: {
      condition: string;
      action: string;
      notification: string[];
    }[];
  };

  @ApiProperty({ description: 'Policy compliance requirements' })
  @IsObject()
  compliance: {
    regulations: string[];
    standards: string[];
    requirements: string[];
  };

  @ApiProperty({ description: 'Policy review frequency' })
  @IsString()
  reviewFrequency: string;

  @ApiProperty({ description: 'Policy owner' })
  @IsString()
  owner: string;

  @ApiProperty({ description: 'Policy status' })
  @IsString()
  status: string;
}

export class RiskScenarioDto {
  @ApiProperty({ description: 'Scenario name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Scenario description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Scenario type', enum: ScenarioType })
  @IsEnum(ScenarioType)
  type: ScenarioType;

  @ApiProperty({ description: 'Scenario parameters' })
  @IsObject()
  parameters: {
    variables: Array<{
      name: string;
      value: number;
      range: { min: number; max: number };
    }>;
    assumptions: string[];
    constraints: string[];
  };

  @ApiProperty({ description: 'Scenario outcomes' })
  @IsObject()
  outcomes: {
    bestCase: number;
    baseCase: number;
    worstCase: number;
    probability: number;
  };

  @ApiProperty({ description: 'Scenario status' })
  @IsString()
  status: string;
}

// Response DTOs
export class RiskProfileDto {
  @ApiProperty({ description: 'Risk profile ID' })
  id: string;

  @ApiProperty({ description: 'Risk profile name' })
  name: string;

  @ApiProperty({ description: 'Risk profile description' })
  description: string;

  @ApiProperty({ description: 'Risk type', enum: RiskType })
  type: RiskType;

  @ApiProperty({ description: 'Risk level', enum: RiskLevel })
  level: RiskLevel;

  @ApiProperty({ description: 'Risk status', enum: RiskStatus })
  status: RiskStatus;

  @ApiProperty({ description: 'Risk score' })
  score: number;

  @ApiProperty({ description: 'Risk factors' })
  factors: Array<{
    factor: string;
    impact: number;
    probability: number;
    severity: number;
  }>;

  @ApiProperty({ description: 'Risk indicators' })
  indicators: Array<{
    indicator: string;
    value: number;
    threshold: number;
    status: string;
  }>;

  @ApiProperty({ description: 'Risk mitigation strategies' })
  mitigation: Array<{
    strategy: string;
    effectiveness: number;
    cost: number;
    timeline: string;
    status: string;
  }>;

  @ApiProperty({ description: 'Risk monitoring' })
  monitoring: {
    frequency: string;
    metrics: string[];
    alerts: string[];
    reporting: string[];
  };

  @ApiProperty({ description: 'Risk owner' })
  owner: string;

  @ApiProperty({ description: 'Risk stakeholders' })
  stakeholders: string[];

  @ApiProperty({ description: 'Risk timeline' })
  timeline: {
    identified: Date;
    assessed: Date;
    mitigated: Date;
    monitored: Date;
    closed: Date;
  };

  @ApiProperty({ description: 'Risk documentation' })
  documentation: {
    reports: string[];
    policies: string[];
    procedures: string[];
    training: string[];
  };
}

export class RiskMitigationDto {
  @ApiProperty({ description: 'Mitigation ID' })
  id: string;

  @ApiProperty({ description: 'Mitigation strategy' })
  strategy: string;

  @ApiProperty({ description: 'Mitigation description' })
  description: string;

  @ApiProperty({ description: 'Risk type', enum: RiskType })
  riskType: RiskType;

  @ApiProperty({ description: 'Mitigation effectiveness' })
  effectiveness: number;

  @ApiProperty({ description: 'Implementation cost' })
  cost: number;

  @ApiProperty({ description: 'Implementation timeline' })
  timeline: string;

  @ApiProperty({ description: 'Mitigation status' })
  status: string;

  @ApiProperty({ description: 'Mitigation owner' })
  owner: string;

  @ApiProperty({ description: 'Mitigation resources' })
  resources: {
    personnel: string[];
    budget: number;
    tools: string[];
    training: string[];
  };

  @ApiProperty({ description: 'Mitigation metrics' })
  metrics: {
    target: number;
    current: number;
    progress: number;
    kpis: string[];
  };
}

export class RiskMonitoringDto {
  @ApiProperty({ description: 'Monitoring dashboard' })
  dashboard: {
    totalRisks: number;
    activeRisks: number;
    mitigatedRisks: number;
    criticalRisks: number;
    riskTrend: string;
    riskDistribution: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
  };

  @ApiProperty({ description: 'Risk alerts' })
  alerts: Array<{
    id: string;
    type: string;
    severity: AlertSeverity;
    message: string;
    timestamp: Date;
    status: AlertStatus;
  }>;

  @ApiProperty({ description: 'Risk metrics' })
  metrics: {
    riskScore: number;
    riskTrend: string;
    mitigationProgress: number;
    complianceScore: number;
    alertCount: number;
    resolutionTime: number;
  };

  @ApiProperty({ description: 'Risk trends' })
  trends: Array<{
    date: Date;
    riskScore: number;
    alertCount: number;
    mitigationCount: number;
  }>;
}

export class RiskReportDto {
  @ApiProperty({ description: 'Report ID' })
  id: string;

  @ApiProperty({ description: 'Report name' })
  name: string;

  @ApiProperty({ description: 'Report type' })
  type: string;

  @ApiProperty({ description: 'Report description' })
  description: string;

  @ApiProperty({ description: 'Report period' })
  period: {
    start: Date;
    end: Date;
  };

  @ApiProperty({ description: 'Report summary' })
  summary: {
    totalRisks: number;
    criticalRisks: number;
    mitigatedRisks: number;
    newRisks: number;
    riskScore: number;
    recommendations: string[];
  };

  @ApiProperty({ description: 'Report details' })
  details: {
    riskAnalysis: any;
    mitigationStatus: any;
    complianceStatus: any;
    recommendations: any;
  };

  @ApiProperty({ description: 'Report status' })
  status: string;

  @ApiProperty({ description: 'Report generated by' })
  generatedBy: string;

  @ApiProperty({ description: 'Report generated at' })
  generatedAt: Date;
}

export class RiskAlertDto {
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

  @ApiProperty({ description: 'Risk type', enum: RiskType })
  riskType: RiskType;

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

export class RiskMetricsDto {
  @ApiProperty({ description: 'Risk metrics' })
  metrics: {
    totalRisks: number;
    activeRisks: number;
    mitigatedRisks: number;
    criticalRisks: number;
    riskScore: number;
    riskTrend: string;
    mitigationProgress: number;
    complianceScore: number;
    alertCount: number;
    resolutionTime: number;
  };

  @ApiProperty({ description: 'Risk distribution' })
  distribution: Array<{
    type: string;
    count: number;
    percentage: number;
    trend: string;
  }>;

  @ApiProperty({ description: 'Risk trends' })
  trends: Array<{
    date: Date;
    riskScore: number;
    alertCount: number;
    mitigationCount: number;
  }>;

  @ApiProperty({ description: 'Risk KPIs' })
  kpis: {
    riskReduction: number;
    mitigationEfficiency: number;
    alertResponseTime: number;
    complianceRate: number;
    costSavings: number;
  };
}

export class RiskAssessmentResponseDto {
  @ApiProperty({ description: 'Risk assessment ID' })
  assessmentId: string;

  @ApiProperty({ description: 'Risk profiles', type: [RiskProfileDto] })
  riskProfiles: RiskProfileDto[];

  @ApiProperty({ description: 'Risk mitigation strategies', type: [RiskMitigationDto] })
  mitigationStrategies: RiskMitigationDto[];

  @ApiProperty({ description: 'Risk monitoring data' })
  monitoring: RiskMonitoringDto;

  @ApiProperty({ description: 'Risk assessment summary' })
  summary: {
    totalRisks: number;
    criticalRisks: number;
    mitigatedRisks: number;
    riskScore: number;
    recommendations: string[];
    nextSteps: string[];
  };

  @ApiProperty({ description: 'Risk assessment timestamp' })
  timestamp: Date;
}

// Additional DTOs
export class RiskFactorDto {
  @ApiProperty({ description: 'Factor name' })
  factor: string;

  @ApiProperty({ description: 'Factor impact' })
  impact: number;

  @ApiProperty({ description: 'Factor probability' })
  probability: number;

  @ApiProperty({ description: 'Factor severity' })
  severity: number;

  @ApiProperty({ description: 'Factor description' })
  description: string;

  @ApiProperty({ description: 'Factor category' })
  category: string;
}

export class RiskIndicatorDto {
  @ApiProperty({ description: 'Indicator name' })
  indicator: string;

  @ApiProperty({ description: 'Indicator value' })
  value: number;

  @ApiProperty({ description: 'Indicator threshold' })
  threshold: number;

  @ApiProperty({ description: 'Indicator status' })
  status: string;

  @ApiProperty({ description: 'Indicator trend' })
  trend: string;

  @ApiProperty({ description: 'Indicator description' })
  description: string;
}

export class RiskMitigationStrategyDto {
  @ApiProperty({ description: 'Strategy name' })
  strategy: string;

  @ApiProperty({ description: 'Strategy description' })
  description: string;

  @ApiProperty({ description: 'Strategy effectiveness' })
  effectiveness: number;

  @ApiProperty({ description: 'Implementation cost' })
  cost: number;

  @ApiProperty({ description: 'Implementation timeline' })
  timeline: string;

  @ApiProperty({ description: 'Strategy status' })
  status: string;

  @ApiProperty({ description: 'Strategy owner' })
  owner: string;
}

export class RiskComplianceDto {
  @ApiProperty({ description: 'Compliance status' })
  status: string;

  @ApiProperty({ description: 'Compliance score' })
  score: number;

  @ApiProperty({ description: 'Compliance requirements' })
  requirements: Array<{
    requirement: string;
    status: string;
    compliance: number;
    gap: string;
  }>;

  @ApiProperty({ description: 'Compliance recommendations' })
  recommendations: string[];
}

export class RiskInsuranceDto {
  @ApiProperty({ description: 'Insurance type', enum: CoverageType })
  type: CoverageType;

  @ApiProperty({ description: 'Coverage amount' })
  coverageAmount: number;

  @ApiProperty({ description: 'Premium amount' })
  premiumAmount: number;

  @ApiProperty({ description: 'Deductible amount' })
  deductibleAmount: number;

  @ApiProperty({ description: 'Coverage period' })
  coveragePeriod: {
    start: Date;
    end: Date;
  };

  @ApiProperty({ description: 'Insurance provider' })
  provider: string;

  @ApiProperty({ description: 'Insurance status' })
  status: string;

  @ApiProperty({ description: 'Insurance recommendations' })
  recommendations: string[];
}

export class RiskDashboardDto {
  @ApiProperty({ description: 'Dashboard overview' })
  overview: {
    totalRisks: number;
    activeRisks: number;
    criticalRisks: number;
    riskScore: number;
    riskTrend: string;
  };

  @ApiProperty({ description: 'Risk distribution' })
  distribution: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Risk alerts' })
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    timestamp: Date;
  }>;

  @ApiProperty({ description: 'Risk trends' })
  trends: Array<{
    date: Date;
    riskScore: number;
    alertCount: number;
  }>;

  @ApiProperty({ description: 'Risk KPIs' })
  kpis: {
    riskReduction: number;
    mitigationEfficiency: number;
    complianceRate: number;
    costSavings: number;
  };
}

export class RiskTrendDto {
  @ApiProperty({ description: 'Trend period' })
  period: {
    start: Date;
    end: Date;
  };

  @ApiProperty({ description: 'Trend data' })
  data: Array<{
    date: Date;
    riskScore: number;
    alertCount: number;
    mitigationCount: number;
  }>;

  @ApiProperty({ description: 'Trend analysis' })
  analysis: {
    direction: string;
    magnitude: number;
    significance: string;
    forecast: string;
  };
}

export class RiskHeatmapDto {
  @ApiProperty({ description: 'Heatmap data' })
  data: Array<{
    x: string;
    y: string;
    value: number;
    risk: string;
    level: string;
  }>;

  @ApiProperty({ description: 'Heatmap dimensions' })
  dimensions: {
    x: string[];
    y: string[];
  };

  @ApiProperty({ description: 'Heatmap legend' })
  legend: {
    min: number;
    max: number;
    colors: string[];
  };
}
