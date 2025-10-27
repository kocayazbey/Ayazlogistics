import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between, gte, lte, desc, sql, count } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { slaMetrics, slaViolations, slaMetricRecords } from '../../../../database/schema/shared/sla.schema';

interface SLAMetric {
  id: string;
  customerId: string;
  contractId: string;
  metricType: 'order_accuracy' | 'on_time_shipment' | 'inventory_accuracy' | 'cycle_time' | 'damage_rate' | 'order_fill_rate';
  targetValue: number;
  actualValue?: number;
  unit: string;
  period: 'daily' | 'weekly' | 'monthly';
  penaltyAmount?: number;
  penaltyCurrency?: string;
}

interface SLAViolation {
  id: string;
  customerId: string;
  contractId: string;
  metricType: string;
  targetValue: number;
  actualValue: number;
  variance: number;
  violationDate: Date;
  penaltyApplied: boolean;
  penaltyAmount?: number;
  notes?: string;
}

interface SLAPerformanceReport {
  customerId: string;
  contractId: string;
  period: { startDate: Date; endDate: Date };
  overallCompliance: number;
  metrics: Array<{
    metricType: string;
    target: number;
    actual: number;
    compliance: number;
    violations: number;
  }>;
  penalties: {
    totalAmount: number;
    currency: string;
    breakdown: Array<{
      metricType: string;
      amount: number;
      count: number;
    }>;
  };
}

@Injectable()
export class SLATrackingService {
  private readonly logger = new Logger(SLATrackingService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async configureSLA(
    metrics: Array<Omit<SLAMetric, 'id' | 'actualValue'>>,
    tenantId: string,
    userId: string,
  ): Promise<SLAMetric[]> {
    const configuredMetrics: SLAMetric[] = [];

    for (const metric of metrics) {
      try {
        const [savedMetric] = await this.db
          .insert(slaMetrics)
          .values({
            tenantId,
            customerId: metric.customerId,
            contractId: metric.contractId,
            metricType: metric.metricType,
            targetValue: metric.targetValue.toString(),
            unit: metric.unit || 'percentage',
            period: metric.period,
            penaltyAmount: metric.penaltyAmount?.toString(),
            penaltyCurrency: metric.penaltyCurrency || 'TRY',
            isActive: true,
            metadata: {},
          })
          .returning();

        configuredMetrics.push({
          id: savedMetric.id,
          customerId: savedMetric.customerId,
          contractId: savedMetric.contractId,
          metricType: savedMetric.metricType as any,
          targetValue: Number(savedMetric.targetValue),
          unit: savedMetric.unit || 'percentage',
          period: savedMetric.period as any,
          penaltyAmount: savedMetric.penaltyAmount ? Number(savedMetric.penaltyAmount) : undefined,
          penaltyCurrency: savedMetric.penaltyCurrency || undefined,
        });

        await this.eventBus.emit('sla.metric.configured', {
          metricId: savedMetric.id,
          customerId: metric.customerId,
          contractId: metric.contractId,
          metricType: metric.metricType,
          targetValue: metric.targetValue,
          tenantId,
        });
      } catch (error) {
        this.logger.error(`Failed to configure SLA metric: ${metric.metricType}`, error);
        throw error;
      }
    }

    return configuredMetrics;
  }

  async recordMetricValue(
    metricId: string,
    actualValue: number,
    date: Date,
    tenantId: string,
  ): Promise<void> {
    try {
      const metric = await this.getSLAMetric(metricId, tenantId);
      if (!metric) {
        throw new Error(`SLA metric not found: ${metricId}`);
      }

      // Record metric value
      await this.db
        .insert(slaMetricRecords)
        .values({
          tenantId,
          metricId,
          customerId: metric.customerId,
          contractId: metric.contractId,
          recordedDate: date.toISOString().split('T')[0],
          actualValue: actualValue.toString(),
          complianceRate: this.calculateComplianceRate(metric.metricType, metric.targetValue, actualValue).toString(),
        });

      // Update SLA metric with latest actual value
      await this.db
        .update(slaMetrics)
        .set({
          actualValue: actualValue.toString(),
          updatedAt: new Date(),
        })
        .where(and(eq(slaMetrics.id, metricId), eq(slaMetrics.tenantId, tenantId)));

      await this.eventBus.emit('sla.metric.recorded', {
        metricId,
        actualValue,
        date,
        tenantId,
      });

      // Check for violation
      await this.checkSLACompliance(metricId, actualValue, date, tenantId);
    } catch (error) {
      this.logger.error(`Failed to record metric value for ${metricId}`, error);
      throw error;
    }
  }

  private calculateComplianceRate(metricType: string, target: number, actual: number): number {
    if (['order_accuracy', 'inventory_accuracy', 'order_fill_rate', 'on_time_shipment'].includes(metricType)) {
      return (actual / target) * 100;
    }
    if (['cycle_time', 'damage_rate'].includes(metricType)) {
      return (target / actual) * 100;
    }
    return 0;
  }

  async checkSLACompliance(
    metricId: string,
    actualValue: number,
    date: Date,
    tenantId: string,
  ): Promise<void> {
    const metric = await this.getSLAMetric(metricId, tenantId);

    if (!metric) return;

    const isViolation = this.detectViolation(metric.metricType, metric.targetValue, actualValue);

    if (isViolation) {
      await this.recordViolation(
        {
          customerId: metric.customerId,
          contractId: metric.contractId,
          metricType: metric.metricType,
          targetValue: metric.targetValue,
          actualValue,
          violationDate: date,
          penaltyAmount: metric.penaltyAmount,
        },
        tenantId,
      );
    }
  }

  private detectViolation(metricType: string, target: number, actual: number): boolean {
    // For accuracy and fill rate metrics, actual should be >= target
    if (['order_accuracy', 'inventory_accuracy', 'order_fill_rate'].includes(metricType)) {
      return actual < target;
    }

    // For cycle time and damage rate, actual should be <= target
    if (['cycle_time', 'damage_rate'].includes(metricType)) {
      return actual > target;
    }

    // For on-time shipment, actual should be >= target
    if (metricType === 'on_time_shipment') {
      return actual < target;
    }

    return false;
  }

  async recordViolation(
    data: Omit<SLAViolation, 'id' | 'variance' | 'penaltyApplied'>,
    tenantId: string,
  ): Promise<SLAViolation> {
    try {
      const variance = Math.abs(data.actualValue - data.targetValue);
      const metric = await this.getSLAMetricByType(data.customerId, data.contractId, data.metricType, tenantId);

      const [violation] = await this.db
        .insert(slaViolations)
        .values({
          tenantId,
          customerId: data.customerId,
          contractId: data.contractId,
          metricId: metric?.id,
          metricType: data.metricType,
          targetValue: data.targetValue.toString(),
          actualValue: data.actualValue.toString(),
          variance: variance.toString(),
          violationDate: data.violationDate.toISOString().split('T')[0],
          penaltyApplied: !!data.penaltyAmount,
          penaltyAmount: data.penaltyAmount?.toString(),
          notes: data.notes,
        })
        .returning();

      await this.eventBus.emit('sla.violation.recorded', {
        violationId: violation.id,
        customerId: data.customerId,
        contractId: data.contractId,
        metricType: data.metricType,
        variance,
        penaltyAmount: data.penaltyAmount,
        tenantId,
      });

      return {
        id: violation.id,
        customerId: violation.customerId,
        contractId: violation.contractId,
        metricType: violation.metricType,
        targetValue: Number(violation.targetValue),
        actualValue: Number(violation.actualValue),
        variance: Number(violation.variance),
        violationDate: violation.violationDate,
        penaltyApplied: violation.penaltyApplied,
        penaltyAmount: violation.penaltyAmount ? Number(violation.penaltyAmount) : undefined,
        notes: violation.notes || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to record SLA violation', error);
      throw error;
    }
  }

  async getSLAPerformanceReport(
    customerId: string,
    contractId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<SLAPerformanceReport> {
    const metrics = await this.getSLAMetrics(customerId, contractId, tenantId);

    const metricPerformance = await Promise.all(
      metrics.map(async (metric) => {
        const performance = await this.calculateMetricPerformance(
          metric.id,
          startDate,
          endDate,
          tenantId,
        );

        return {
          metricType: metric.metricType,
          target: metric.targetValue,
          actual: performance.actualValue,
          compliance: performance.compliance,
          violations: performance.violations,
        };
      }),
    );

    const overallCompliance =
      metricPerformance.reduce((sum, m) => sum + m.compliance, 0) / metricPerformance.length;

    const violations = await this.getViolations(customerId, contractId, startDate, endDate, tenantId);

    const penaltyBreakdown = this.calculatePenaltyBreakdown(violations);

    return {
      customerId,
      contractId,
      period: { startDate, endDate },
      overallCompliance: Math.round(overallCompliance * 100) / 100,
      metrics: metricPerformance,
      penalties: {
        totalAmount: penaltyBreakdown.reduce((sum, p) => sum + p.amount, 0),
        currency: 'TRY',
        breakdown: penaltyBreakdown,
      },
    };
  }

  private async getSLAMetric(metricId: string, tenantId: string): Promise<SLAMetric | null> {
    try {
      const [metric] = await this.db
        .select()
        .from(slaMetrics)
        .where(and(eq(slaMetrics.id, metricId), eq(slaMetrics.tenantId, tenantId)))
        .limit(1);

      if (!metric) return null;

      return {
        id: metric.id,
        customerId: metric.customerId,
        contractId: metric.contractId,
        metricType: metric.metricType as any,
        targetValue: Number(metric.targetValue),
        actualValue: metric.actualValue ? Number(metric.actualValue) : undefined,
        unit: metric.unit || 'percentage',
        period: metric.period as any,
        penaltyAmount: metric.penaltyAmount ? Number(metric.penaltyAmount) : undefined,
        penaltyCurrency: metric.penaltyCurrency || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get SLA metric: ${metricId}`, error);
      return null;
    }
  }

  private async getSLAMetricByType(
    customerId: string,
    contractId: string,
    metricType: string,
    tenantId: string,
  ): Promise<SLAMetric | null> {
    try {
      const [metric] = await this.db
        .select()
        .from(slaMetrics)
        .where(
          and(
            eq(slaMetrics.customerId, customerId),
            eq(slaMetrics.contractId, contractId),
            eq(slaMetrics.metricType, metricType),
            eq(slaMetrics.tenantId, tenantId),
            eq(slaMetrics.isActive, true),
          ),
        )
        .limit(1);

      if (!metric) return null;

      return {
        id: metric.id,
        customerId: metric.customerId,
        contractId: metric.contractId,
        metricType: metric.metricType as any,
        targetValue: Number(metric.targetValue),
        actualValue: metric.actualValue ? Number(metric.actualValue) : undefined,
        unit: metric.unit || 'percentage',
        period: metric.period as any,
        penaltyAmount: metric.penaltyAmount ? Number(metric.penaltyAmount) : undefined,
        penaltyCurrency: metric.penaltyCurrency || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get SLA metric by type: ${metricType}`, error);
      return null;
    }
  }

  private async getSLAMetrics(
    customerId: string,
    contractId: string,
    tenantId: string,
  ): Promise<SLAMetric[]> {
    try {
      const metrics = await this.db
        .select()
        .from(slaMetrics)
        .where(
          and(
            eq(slaMetrics.customerId, customerId),
            eq(slaMetrics.contractId, contractId),
            eq(slaMetrics.tenantId, tenantId),
            eq(slaMetrics.isActive, true),
          ),
        );

      return metrics.map((metric) => ({
        id: metric.id,
        customerId: metric.customerId,
        contractId: metric.contractId,
        metricType: metric.metricType as any,
        targetValue: Number(metric.targetValue),
        actualValue: metric.actualValue ? Number(metric.actualValue) : undefined,
        unit: metric.unit || 'percentage',
        period: metric.period as any,
        penaltyAmount: metric.penaltyAmount ? Number(metric.penaltyAmount) : undefined,
        penaltyCurrency: metric.penaltyCurrency || undefined,
      }));
    } catch (error) {
      this.logger.error(`Failed to get SLA metrics for customer: ${customerId}`, error);
      return [];
    }
  }

  private async calculateMetricPerformance(
    metricId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<{ actualValue: number; compliance: number; violations: number }> {
    try {
      const metric = await this.getSLAMetric(metricId, tenantId);
      if (!metric) {
        return { actualValue: 0, compliance: 0, violations: 0 };
      }

      // Get average actual value from records
      const records = await this.db
        .select({
          avgValue: sql<number>`AVG(${slaMetricRecords.actualValue}::numeric)`,
        })
        .from(slaMetricRecords)
        .where(
          and(
            eq(slaMetricRecords.metricId, metricId),
            eq(slaMetricRecords.tenantId, tenantId),
            gte(slaMetricRecords.recordedDate, startDate.toISOString().split('T')[0]),
            lte(slaMetricRecords.recordedDate, endDate.toISOString().split('T')[0]),
          ),
        );

      const avgActualValue = records[0]?.avgValue ? Number(records[0].avgValue) : metric.actualValue || 0;
      const compliance = this.calculateComplianceRate(metric.metricType, metric.targetValue, avgActualValue);

      // Count violations in period
      const [violationCount] = await this.db
        .select({ count: count() })
        .from(slaViolations)
        .where(
          and(
            eq(slaViolations.tenantId, tenantId),
            eq(slaViolations.metricId, metricId),
            gte(slaViolations.violationDate, startDate.toISOString().split('T')[0]),
            lte(slaViolations.violationDate, endDate.toISOString().split('T')[0]),
          ),
        );

      return {
        actualValue: avgActualValue,
        compliance: Math.max(0, Math.min(100, compliance)),
        violations: Number(violationCount?.count || 0),
      };
    } catch (error) {
      this.logger.error(`Failed to calculate metric performance: ${metricId}`, error);
      return { actualValue: 0, compliance: 0, violations: 0 };
    }
  }

  private async getViolations(
    customerId: string,
    contractId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<SLAViolation[]> {
    try {
      const violations = await this.db
        .select()
        .from(slaViolations)
        .where(
          and(
            eq(slaViolations.customerId, customerId),
            eq(slaViolations.contractId, contractId),
            eq(slaViolations.tenantId, tenantId),
            gte(slaViolations.violationDate, startDate.toISOString().split('T')[0]),
            lte(slaViolations.violationDate, endDate.toISOString().split('T')[0]),
          ),
        )
        .orderBy(desc(slaViolations.violationDate));

      return violations.map((v) => ({
        id: v.id,
        customerId: v.customerId,
        contractId: v.contractId,
        metricType: v.metricType,
        targetValue: Number(v.targetValue),
        actualValue: Number(v.actualValue),
        variance: Number(v.variance),
        violationDate: v.violationDate,
        penaltyApplied: v.penaltyApplied,
        penaltyAmount: v.penaltyAmount ? Number(v.penaltyAmount) : undefined,
        notes: v.notes || undefined,
      }));
    } catch (error) {
      this.logger.error(`Failed to get violations for customer: ${customerId}`, error);
      return [];
    }
  }

  private calculatePenaltyBreakdown(violations: SLAViolation[]): Array<{
    metricType: string;
    amount: number;
    count: number;
  }> {
    const breakdown: Record<string, { amount: number; count: number }> = {};

    for (const violation of violations) {
      if (!breakdown[violation.metricType]) {
        breakdown[violation.metricType] = { amount: 0, count: 0 };
      }

      breakdown[violation.metricType].amount += violation.penaltyAmount || 0;
      breakdown[violation.metricType].count++;
    }

    return Object.entries(breakdown).map(([metricType, data]) => ({
      metricType,
      ...data,
    }));
  }

  async getSLAComplianceTrend(
    customerId: string,
    contractId: string,
    months: number,
    tenantId: string,
  ): Promise<Array<{ month: string; compliance: number }>> {
    try {
      const metrics = await this.getSLAMetrics(customerId, contractId, tenantId);
      if (metrics.length === 0) return [];

      const trend: Array<{ month: string; compliance: number }> = [];
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const monthCompliances = await Promise.all(
          metrics.map(async (metric) => {
            const perf = await this.calculateMetricPerformance(metric.id, monthStart, monthEnd, tenantId);
            return perf.compliance;
          }),
        );

        const avgCompliance = monthCompliances.reduce((sum, c) => sum + c, 0) / monthCompliances.length;

        trend.push({
          month: monthStart.toISOString().slice(0, 7), // YYYY-MM
          compliance: Math.round(avgCompliance * 100) / 100,
        });
      }

      return trend;
    } catch (error) {
      this.logger.error(`Failed to get SLA compliance trend for customer: ${customerId}`, error);
      return [];
    }
  }
}

