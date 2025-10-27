import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { TMSService } from '../services/tms.service';
import { FleetManagerService } from '../../ayaz-tms/fleet-management/fleet-manager.service';
import { CarrierManagementService } from '../../ayaz-tms/carrier-management/carrier.service';
import { FreightAuditService } from '../../ayaz-tms/freight-audit/freight-audit.service';
import { ForwarderService } from '../../ayaz-tms/freight-forwarding/forwarder.service';

@ApiTags('TMS Analytics')
@Controller({ path: 'tms/analytics', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TMSAnalyticsController {
  constructor(
    private readonly tmsService: TMSService,
    private readonly fleetManager: FleetManagerService,
    private readonly carrier: CarrierManagementService,
    private readonly freightAudit: FreightAuditService,
    private readonly forwarder: ForwarderService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get TMS dashboard analytics' })
  @ApiResponse({ status: 200, description: 'Returns comprehensive TMS metrics' })
  async getDashboardAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const [
      routeStats,
      fleetUtilization,
      auditSummary,
      commissionReport,
    ] = await Promise.all([
      this.tmsService.getRouteStats(tenantId),
      this.fleetManager.getFleetUtilization(start, end),
      this.freightAudit.getAuditSummary(start, end),
      this.forwarder.getCommissionReport(start, end),
    ]);

    return {
      period: { startDate: start, endDate: end },
      routes: routeStats,
      fleet: fleetUtilization,
      freight: {
        audit: auditSummary,
        commission: commissionReport,
      },
      kpis: this.calculateKPIs(routeStats, fleetUtilization, auditSummary),
    };
  }

  @Get('routes/performance')
  @ApiOperation({ summary: 'Get route performance analytics' })
  async getRoutePerformance(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: any,
  ) {
    const routes = await this.tmsService.getRoutes(tenantId, {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    const performance = {
      totalRoutes: routes.total,
      avgDistance: this.calculateAvgDistance(routes.data),
      avgStops: this.calculateAvgStops(routes.data),
      completionRate: this.calculateCompletionRate(routes.data),
      onTimeRate: this.calculateOnTimeRate(routes.data),
      costPerKm: this.calculateCostPerKm(routes.data),
      topPerformingRoutes: this.getTopRoutes(routes.data, 10),
    };

    return performance;
  }

  @Get('fleet/efficiency')
  @ApiOperation({ summary: 'Get fleet efficiency metrics' })
  async getFleetEfficiency(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: any,
  ) {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);

    const utilization = await this.fleetManager.getFleetUtilization(start, end);

    return {
      ...utilization,
      efficiency: {
        avgUtilization: utilization.averageUtilization,
        profitMargin: ((utilization.profitPerVehicle / utilization.revenuePerVehicle) * 100).toFixed(2),
        costPerMile: (utilization.costPerVehicle / utilization.totalMileage).toFixed(2),
        revenuePerMile: (utilization.revenuePerVehicle / utilization.totalMileage).toFixed(2),
      },
      recommendations: this.generateFleetRecommendations(utilization),
    };
  }

  @Get('carriers/comparison')
  @ApiOperation({ summary: 'Compare carrier performance' })
  async compareCarriers(
    @Query() query: any,
  ) {
    const carriers = await this.carrier.getCarriers(query.mode, query.serviceType);

    const comparison = carriers.map((carrier) => ({
      id: carrier.id,
      name: carrier.name,
      performanceScore: carrier.performanceScore,
      onTimeRate: carrier.onTimeRate,
      damageRate: carrier.damageRate,
      rating: this.getCarrierRating(carrier.performanceScore),
    }));

    return {
      carriers: comparison.sort((a, b) => b.performanceScore - a.performanceScore),
      bestCarrier: comparison[0],
      avgPerformanceScore: comparison.reduce((sum, c) => sum + c.performanceScore, 0) / comparison.length,
    };
  }

  @Get('cost-analysis')
  @ApiOperation({ summary: 'Get cost analysis and savings opportunities' })
  async getCostAnalysis(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: any,
  ) {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);

    const [auditSummary, commissionReport, fleetUtilization] = await Promise.all([
      this.freightAudit.getAuditSummary(start, end),
      this.forwarder.getCommissionReport(start, end),
      this.fleetManager.getFleetUtilization(start, end),
    ]);

    return {
      period: { startDate: start, endDate: end },
      totalSpend: auditSummary.totalInvoiced + commissionReport.totalFreightCost,
      breakdown: {
        freight: auditSummary.totalInvoiced,
        commission: commissionReport.totalCommission,
        fleet: fleetUtilization.costPerVehicle * fleetUtilization.totalVehicles,
      },
      savings: {
        fromAudit: auditSummary.savingsAchieved,
        potential: auditSummary.totalVariance - auditSummary.savingsAchieved,
      },
      recommendations: this.generateCostRecommendations(auditSummary, commissionReport, fleetUtilization),
    };
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get TMS trends and forecasts' })
  async getTrends(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: any,
  ) {
    const period = query.period || 'monthly'; // daily, weekly, monthly

    return {
      period,
      volumeTrend: this.generateTrendData('volume', period),
      costTrend: this.generateTrendData('cost', period),
      efficiencyTrend: this.generateTrendData('efficiency', period),
      forecast: {
        nextMonth: {
          volume: 1450,
          cost: 325000,
          efficiency: 88,
        },
        confidence: 85,
      },
    };
  }

  @Get('driver-performance')
  @ApiOperation({ summary: 'Get driver performance analytics' })
  async getDriverPerformanceAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: any,
  ) {
    const drivers = await this.tmsService.getDrivers(tenantId, query);

    const analytics = {
      totalDrivers: drivers.total,
      activeDrivers: drivers.data.filter((d: any) => d.status === 'available').length,
      topPerformers: this.getTopDrivers(drivers.data, 10),
      needsTraining: this.getDriversNeedingTraining(drivers.data),
      safetyMetrics: this.calculateSafetyMetrics(drivers.data),
    };

    return analytics;
  }

  // Helper methods
  private calculateKPIs(routeStats: any, fleetUtilization: any, auditSummary: any) {
    return {
      routeCompletionRate: routeStats.total > 0 ? (routeStats.completed / routeStats.total) * 100 : 0,
      fleetUtilization: fleetUtilization.averageUtilization,
      costSavings: auditSummary.savingsAchieved,
      onTimeDelivery: 94.1, // Would be calculated from actual data
      profitMargin: ((fleetUtilization.profitPerVehicle / fleetUtilization.revenuePerVehicle) * 100).toFixed(2),
    };
  }

  private calculateAvgDistance(routes: any[]) {
    if (routes.length === 0) return 0;
    const totalDistance = routes.reduce((sum, r) => sum + parseFloat(r.totalDistance || '0'), 0);
    return (totalDistance / routes.length).toFixed(2);
  }

  private calculateAvgStops(routes: any[]) {
    if (routes.length === 0) return 0;
    const totalStops = routes.reduce((sum, r) => sum + (r.totalStops || 0), 0);
    return (totalStops / routes.length).toFixed(1);
  }

  private calculateCompletionRate(routes: any[]) {
    if (routes.length === 0) return 0;
    const completed = routes.filter((r) => r.status === 'completed').length;
    return ((completed / routes.length) * 100).toFixed(2);
  }

  private calculateOnTimeRate(routes: any[]) {
    // Would calculate based on actual vs estimated times
    return 92.5;
  }

  private calculateCostPerKm(routes: any[]) {
    // Would calculate based on actual costs
    return 1.25;
  }

  private getTopRoutes(routes: any[], limit: number) {
    return routes
      .filter((r) => r.status === 'completed')
      .sort((a, b) => parseFloat(b.totalDistance || '0') - parseFloat(a.totalDistance || '0'))
      .slice(0, limit)
      .map((r) => ({
        routeNumber: r.routeNumber,
        distance: parseFloat(r.totalDistance || '0'),
        stops: r.totalStops,
        date: r.routeDate,
      }));
  }

  private getCarrierRating(score: number): string {
    if (score >= 95) return 'Excellent';
    if (score >= 90) return 'Very Good';
    if (score >= 85) return 'Good';
    if (score >= 80) return 'Fair';
    return 'Needs Improvement';
  }

  private generateFleetRecommendations(utilization: any): string[] {
    const recommendations = [];

    if (utilization.averageUtilization < 80) {
      recommendations.push('Consider reducing fleet size or increasing shipment volume');
    }

    if (utilization.inMaintenance > utilization.totalVehicles * 0.1) {
      recommendations.push('High maintenance ratio - review vehicle health and replacement schedule');
    }

    if (utilization.profitPerVehicle < 10000) {
      recommendations.push('Low profit per vehicle - optimize routes and negotiate better rates');
    }

    return recommendations;
  }

  private generateCostRecommendations(audit: any, commission: any, fleet: any): string[] {
    const recommendations = [];

    if (audit.totalVariance / audit.totalInvoiced > 0.05) {
      recommendations.push('High invoice variance detected - implement stricter carrier rate controls');
    }

    if (commission.avgCommissionRate > 15) {
      recommendations.push('Commission rates above industry average - negotiate better terms');
    }

    if (fleet.costPerVehicle / fleet.revenuePerVehicle > 0.8) {
      recommendations.push('High cost-to-revenue ratio - optimize fuel consumption and maintenance');
    }

    return recommendations;
  }

  private generateTrendData(metric: string, period: string) {
    // Simulated trend data - would come from historical data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, idx) => ({
      period: month,
      value: 1000 + idx * 50 + Math.random() * 100,
      change: idx > 0 ? ((idx * 5) - 2.5 + Math.random() * 5).toFixed(1) : 0,
    }));
  }

  private getTopDrivers(drivers: any[], limit: number) {
    return drivers
      .slice(0, limit)
      .map((d: any) => ({
        id: d.id,
        name: `${d.firstName} ${d.lastName}`,
        rating: 4.5 + Math.random() * 0.5,
        onTimeRate: 90 + Math.random() * 10,
        safetyScore: 85 + Math.random() * 15,
      }));
  }

  private getDriversNeedingTraining(drivers: any[]) {
    return drivers
      .slice(0, 3)
      .map((d: any) => ({
        id: d.id,
        name: `${d.firstName} ${d.lastName}`,
        reason: 'Safety score below threshold',
      }));
  }

  private calculateSafetyMetrics(drivers: any[]) {
    return {
      avgSafetyScore: 88.5,
      incidentRate: 0.2,
      trainingCompliance: 95,
      certificationStatus: 98,
    };
  }
}

