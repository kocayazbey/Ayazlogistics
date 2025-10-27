import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StandardizedDatabaseService } from '../../core/database/standardized-database.service';

export interface CostMetric {
  id: string;
  service: string;
  resource: string;
  cost: number;
  currency: string;
  timestamp: Date;
  tags: Record<string, string>;
  region?: string;
  environment: 'production' | 'staging' | 'development';
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  threshold: number;
  currentSpend: number;
  alertType: 'warning' | 'critical' | 'exceeded';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface CostOptimization {
  id: string;
  service: string;
  recommendation: string;
  potentialSavings: number;
  implementationEffort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
}

@Injectable()
export class FinOpsService {
  private readonly logger = new Logger(FinOpsService.name);
  private readonly costThresholds: Map<string, number>;

  constructor(
    private configService: ConfigService,
    private databaseService: StandardizedDatabaseService
  ) {
    this.costThresholds = this.initializeCostThresholds();
  }

  async recordCostMetric(metric: Omit<CostMetric, 'id' | 'timestamp'>): Promise<CostMetric> {
    const costMetric: CostMetric = {
      id: this.generateMetricId(),
      ...metric,
      timestamp: new Date()
    };

    await this.databaseService.insert('cost_metrics', costMetric);
    
    // Check for budget alerts
    await this.checkBudgetAlerts(costMetric);
    
    this.logger.log(`Cost metric recorded: ${costMetric.service} - ${costMetric.cost} ${costMetric.currency}`);
    
    return costMetric;
  }

  async getCostSummary(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<any> {
    const startDate = this.getPeriodStartDate(period);
    
    const metrics = await this.databaseService.find('cost_metrics', {
      timestamp: { $gte: startDate }
    });

    const summary = {
      totalCost: 0,
      byService: {},
      byEnvironment: {},
      byRegion: {},
      trends: await this.calculateTrends(metrics)
    };

    for (const metric of metrics) {
      summary.totalCost += metric.cost;
      
      summary.byService[metric.service] = (summary.byService[metric.service] || 0) + metric.cost;
      summary.byEnvironment[metric.environment] = (summary.byEnvironment[metric.environment] || 0) + metric.cost;
      
      if (metric.region) {
        summary.byRegion[metric.region] = (summary.byRegion[metric.region] || 0) + metric.cost;
      }
    }

    return summary;
  }

  async createBudgetAlert(alert: Omit<BudgetAlert, 'id' | 'timestamp'>): Promise<BudgetAlert> {
    const budgetAlert: BudgetAlert = {
      id: this.generateAlertId(),
      ...alert,
      timestamp: new Date(),
      acknowledged: false
    };

    await this.databaseService.insert('budget_alerts', budgetAlert);
    
    this.logger.warn(`Budget alert created: ${alert.alertType} - ${alert.message}`);
    
    return budgetAlert;
  }

  async getBudgetAlerts(status?: string): Promise<BudgetAlert[]> {
    const query = status ? { status } : {};
    return await this.databaseService.find('budget_alerts', query);
  }

  async generateCostOptimizations(): Promise<CostOptimization[]> {
    const optimizations: CostOptimization[] = [];
    
    // Analyze unused resources
    const unusedResources = await this.analyzeUnusedResources();
    for (const resource of unusedResources) {
      optimizations.push({
        id: this.generateOptimizationId(),
        service: resource.service,
        recommendation: `Remove unused ${resource.type}: ${resource.name}`,
        potentialSavings: resource.estimatedCost,
        implementationEffort: 'low',
        priority: 'medium',
        status: 'pending'
      });
    }

    // Analyze over-provisioned resources
    const overProvisioned = await this.analyzeOverProvisionedResources();
    for (const resource of overProvisioned) {
      optimizations.push({
        id: this.generateOptimizationId(),
        service: resource.service,
        recommendation: `Right-size ${resource.type}: ${resource.name}`,
        potentialSavings: resource.estimatedSavings,
        implementationEffort: 'medium',
        priority: 'high',
        status: 'pending'
      });
    }

    // Analyze reserved instances
    const reservedInstanceOptimizations = await this.analyzeReservedInstances();
    optimizations.push(...reservedInstanceOptimizations);

    return optimizations;
  }

  async getCostForecast(period: 'monthly' | 'quarterly' | 'yearly'): Promise<any> {
    const historicalData = await this.getHistoricalCostData(period);
    const forecast = this.calculateForecast(historicalData);
    
    return {
      period,
      forecast: forecast.total,
      confidence: forecast.confidence,
      breakdown: forecast.breakdown,
      recommendations: forecast.recommendations
    };
  }

  async createCostDashboard(): Promise<any> {
    const dashboard = {
      id: this.generateDashboardId(),
      name: 'AyazLogistics Cost Dashboard',
      widgets: [
        {
          type: 'cost_summary',
          title: 'Total Monthly Cost',
          data: await this.getCostSummary('monthly')
        },
        {
          type: 'cost_trend',
          title: 'Cost Trend (6 months)',
          data: await this.getCostTrend(6)
        },
        {
          type: 'top_services',
          title: 'Top 5 Services by Cost',
          data: await this.getTopServicesByCost(5)
        },
        {
          type: 'budget_alerts',
          title: 'Active Budget Alerts',
          data: await this.getBudgetAlerts()
        },
        {
          type: 'optimization_opportunities',
          title: 'Cost Optimization Opportunities',
          data: await this.generateCostOptimizations()
        }
      ],
      lastUpdated: new Date()
    };

    await this.databaseService.insert('cost_dashboards', dashboard);
    return dashboard;
  }

  private async checkBudgetAlerts(metric: CostMetric): Promise<void> {
    const serviceThreshold = this.costThresholds.get(metric.service);
    if (!serviceThreshold) return;

    if (metric.cost > serviceThreshold) {
      await this.createBudgetAlert({
        budgetId: `${metric.service}_budget`,
        threshold: serviceThreshold,
        currentSpend: metric.cost,
        alertType: metric.cost > serviceThreshold * 1.5 ? 'critical' : 'warning',
        message: `Service ${metric.service} exceeded budget threshold`
      });
    }
  }

  private async analyzeUnusedResources(): Promise<any[]> {
    // Implementation would analyze cloud resources for unused instances
    return [
      {
        service: 'AWS EC2',
        type: 'instance',
        name: 't3.medium-unused',
        estimatedCost: 50.00
      }
    ];
  }

  private async analyzeOverProvisionedResources(): Promise<any[]> {
    // Implementation would analyze resource utilization
    return [
      {
        service: 'AWS RDS',
        type: 'database',
        name: 'db.r5.2xlarge',
        estimatedSavings: 200.00
      }
    ];
  }

  private async analyzeReservedInstances(): Promise<CostOptimization[]> {
    return [
      {
        id: this.generateOptimizationId(),
        service: 'AWS EC2',
        recommendation: 'Purchase Reserved Instances for predictable workloads',
        potentialSavings: 500.00,
        implementationEffort: 'low',
        priority: 'high',
        status: 'pending'
      }
    ];
  }

  private async getHistoricalCostData(period: string): Promise<CostMetric[]> {
    const startDate = this.getPeriodStartDate(period);
    return await this.databaseService.find('cost_metrics', {
      timestamp: { $gte: startDate }
    });
  }

  private calculateForecast(historicalData: CostMetric[]): any {
    // Simple linear regression for cost forecasting
    const costs = historicalData.map(d => d.cost);
    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    
    return {
      total: avgCost * 1.1, // 10% growth assumption
      confidence: 0.8,
      breakdown: {
        infrastructure: avgCost * 0.6,
        services: avgCost * 0.3,
        data: avgCost * 0.1
      },
      recommendations: [
        'Consider reserved instances for predictable workloads',
        'Implement auto-scaling to reduce over-provisioning',
        'Review and optimize data transfer costs'
      ]
    };
  }

  private async getCostTrend(months: number): Promise<any> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    const metrics = await this.databaseService.find('cost_metrics', {
      timestamp: { $gte: startDate }
    });

    return metrics.map(m => ({
      month: m.timestamp.toISOString().substr(0, 7),
      cost: m.cost,
      service: m.service
    }));
  }

  private async getTopServicesByCost(limit: number): Promise<any[]> {
    const metrics = await this.databaseService.find('cost_metrics', {});
    
    const serviceCosts = {};
    for (const metric of metrics) {
      serviceCosts[metric.service] = (serviceCosts[metric.service] || 0) + metric.cost;
    }

    return Object.entries(serviceCosts)
      .map(([service, cost]) => ({ service, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  private initializeCostThresholds(): Map<string, number> {
    const thresholds = new Map();
    thresholds.set('AWS EC2', 1000);
    thresholds.set('AWS RDS', 500);
    thresholds.set('AWS S3', 200);
    thresholds.set('Kubernetes', 800);
    return thresholds;
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'yearly':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private generateMetricId(): string {
    return `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOptimizationId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDashboardId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
