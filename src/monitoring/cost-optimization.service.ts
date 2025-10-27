import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as AWS from 'aws-sdk';
import * as schema from '@/database/schema';

interface CostMetrics {
  period: { start: Date; end: Date };
  total: number;
  breakdown: {
    compute: number;
    database: number;
    storage: number;
    network: number;
    other: number;
  };
  forecast: number;
  budget: number;
  variance: number;
}

interface CostOptimizationRecommendation {
  id: string;
  category: 'compute' | 'database' | 'storage' | 'network';
  recommendation: string;
  estimatedSavings: number;
  effort: 'low' | 'medium' | 'high';
  priority: number;
  implemented: boolean;
}

interface ResourceUsage {
  resourceId: string;
  resourceType: string;
  utilization: number;
  cost: number;
  recommendation?: string;
}

@Injectable()
export class CostOptimizationService {
  private readonly logger = new Logger(CostOptimizationService.name);
  private costExplorer: AWS.CostExplorer;

  constructor(@Inject(DRIZZLE_ORM) private readonly db: any) {
    AWS.config.update({ region: 'us-east-1' });
    this.costExplorer = new AWS.CostExplorer();
  }

  async getCostMetrics(period: { start: Date; end: Date }): Promise<CostMetrics> {
    try {
      const response = await this.costExplorer.getCostAndUsage({
        TimePeriod: {
          Start: period.start.toISOString().split('T')[0],
          End: period.end.toISOString().split('T')[0],
        },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost'],
        GroupBy: [{
          Type: 'DIMENSION',
          Key: 'SERVICE',
        }],
      }).promise();

      let total = 0;
      const breakdown = {
        compute: 0,
        database: 0,
        storage: 0,
        network: 0,
        other: 0,
      };

      response.ResultsByTime?.forEach(result => {
        result.Groups?.forEach(group => {
          const service = group.Keys?.[0] || '';
          const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
          total += cost;

          if (service.includes('EC2') || service.includes('ECS') || service.includes('EKS')) {
            breakdown.compute += cost;
          } else if (service.includes('RDS') || service.includes('DynamoDB')) {
            breakdown.database += cost;
          } else if (service.includes('S3') || service.includes('EBS')) {
            breakdown.storage += cost;
          } else if (service.includes('CloudFront') || service.includes('DataTransfer')) {
            breakdown.network += cost;
          } else {
            breakdown.other += cost;
          }
        });
      });

      const budget = 50000;
      const forecast = total * 1.1;

      return {
        period,
        total,
        breakdown,
        forecast,
        budget,
        variance: ((total - budget) / budget) * 100,
      };
    } catch (error) {
      this.logger.error('Failed to get cost metrics:', error);
      
      return {
        period,
        total: 0,
        breakdown: { compute: 0, database: 0, storage: 0, network: 0, other: 0 },
        forecast: 0,
        budget: 0,
        variance: 0,
      };
    }
  }

  async analyzeResourceUtilization(): Promise<ResourceUsage[]> {
    const ec2 = new AWS.EC2();
    const cloudwatch = new AWS.CloudWatch();

    try {
      const instances = await ec2.describeInstances().promise();
      const usage: ResourceUsage[] = [];

      for (const reservation of instances.Reservations || []) {
        for (const instance of reservation.Instances || []) {
          if (instance.State?.Name !== 'running') continue;

          const metrics = await cloudwatch.getMetricStatistics({
            Namespace: 'AWS/EC2',
            MetricName: 'CPUUtilization',
            Dimensions: [{ Name: 'InstanceId', Value: instance.InstanceId! }],
            StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
            EndTime: new Date(),
            Period: 3600,
            Statistics: ['Average'],
          }).promise();

          const avgCPU = metrics.Datapoints?.reduce((sum, dp) => sum + (dp.Average || 0), 0) / (metrics.Datapoints?.length || 1);

          let recommendation = '';
          if (avgCPU < 20) {
            recommendation = 'Consider downsizing instance type';
          } else if (avgCPU > 80) {
            recommendation = 'Consider upgrading instance type';
          }

          usage.push({
            resourceId: instance.InstanceId!,
            resourceType: 'EC2',
            utilization: avgCPU,
            cost: 150,
            recommendation,
          });
        }
      }

      return usage;
    } catch (error) {
      this.logger.error('Failed to analyze resource utilization:', error);
      return [];
    }
  }

  async generateOptimizationRecommendations(tenantId: string): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];

    const underutilizedVehicles = await this.db.execute(
      `SELECT COUNT(*) as count FROM vehicles 
       WHERE tenant_id = $1 AND id NOT IN (
         SELECT DISTINCT vehicle_id FROM routes WHERE planned_start_date > NOW() - INTERVAL '30 days'
       )`
    );

    if (parseInt(underutilizedVehicles[0].count) > 0) {
      recommendations.push({
        id: 'rec_vehicles',
        category: 'compute',
        recommendation: `Retire or lease ${underutilizedVehicles[0].count} underutilized vehicles`,
        estimatedSavings: parseInt(underutilizedVehicles[0].count) * 5000,
        effort: 'medium',
        priority: 1,
        implemented: false,
      });
    }

    const oldData = await this.db.execute(
      `SELECT pg_total_relation_size('vehicle_locations') as size`
    );

    const sizeGB = parseInt(oldData[0].size || '0') / (1024 * 1024 * 1024);
    if (sizeGB > 100) {
      recommendations.push({
        id: 'rec_archive',
        category: 'storage',
        recommendation: 'Archive old GPS data to cheaper storage tier',
        estimatedSavings: sizeGB * 0.8 * 10,
        effort: 'low',
        priority: 2,
        implemented: false,
      });
    }

    recommendations.push({
      id: 'rec_reserved',
      category: 'compute',
      recommendation: 'Switch to reserved instances for predictable workloads',
      estimatedSavings: 12000,
      effort: 'low',
      priority: 1,
      implemented: false,
    });

    return recommendations.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  }

  async trackBudgetCompliance(tenantId: string): Promise<any> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const spent = await this.db.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE tenant_id = $1 AND expense_date >= $2`
    );

    const budget = 50000;
    const totalSpent = parseFloat(spent[0].total);
    const remaining = budget - totalSpent;
    const utilizationPercentage = (totalSpent / budget) * 100;

    return {
      budget,
      spent: totalSpent,
      remaining,
      utilizationPercentage: utilizationPercentage.toFixed(2),
      status: utilizationPercentage > 90 ? 'over_budget' : utilizationPercentage > 75 ? 'warning' : 'on_track',
      projectedSpend: totalSpent * (30 / new Date().getDate()),
    };
  }
}

