import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceMetricsService } from './performance-metrics.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('PerformanceMetricsService', () => {
  let service: PerformanceMetricsService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    mockEventBus = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceMetricsService,
        {
          provide: DRIZZLE_ORM,
          useValue: mockDb,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<PerformanceMetricsService>(PerformanceMetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPerformanceMetrics', () => {
    it('should get performance metrics successfully', async () => {
      const tenantId = 'tenant-123';
      const timeRange = 30;
      const department = 'logistics';
      const metricType = 'efficiency';

      const result = await service.getPerformanceMetrics(tenantId, timeRange, department, metricType);

      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.kpis).toBeDefined();
      expect(Array.isArray(result.kpis)).toBe(true);
      expect(result.trends).toBeDefined();
      expect(Array.isArray(result.trends)).toBe(true);
      expect(result.comparisons).toBeDefined();
      expect(Array.isArray(result.comparisons)).toBe(true);
      expect(result.forecasts).toBeDefined();
      expect(Array.isArray(result.forecasts)).toBe(true);
      expect(result.alerts).toBeDefined();
      expect(Array.isArray(result.alerts)).toBe(true);
      expect(result.benchmarks).toBeDefined();
      expect(Array.isArray(result.benchmarks)).toBe(true);
      expect(result.summary).toBeDefined();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'performance.metrics.retrieved',
        expect.objectContaining({
          tenantId,
        }),
      );
    });

    it('should handle different metric types', async () => {
      const tenantId = 'tenant-123';
      const timeRange = 30;
      const department = 'warehouse';
      const metricType = 'productivity';

      const result = await service.getPerformanceMetrics(tenantId, timeRange, department, metricType);

      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.kpis).toBeDefined();
      expect(Array.isArray(result.kpis)).toBe(true);
    });
  });

  describe('getKPIs', () => {
    it('should get KPIs successfully', async () => {
      const tenantId = 'tenant-123';
      const category = 'financial';
      const timeRange = 30;

      mockDb.select.mockResolvedValue([
        {
          id: 'kpi-1',
          name: 'Revenue Growth',
          description: 'Monthly revenue growth rate',
          category: 'financial',
          currentValue: 15.5,
          targetValue: 12.0,
          previousValue: 14.2,
          changePercentage: 9.2,
          trendDirection: 'improving',
          status: 'on_track',
          unit: '%',
          frequency: 'monthly',
          owner: 'Finance Manager',
          stakeholders: ['CEO', 'CFO'],
          lastUpdated: new Date(),
        },
      ]);

      const result = await service.getKPIs(tenantId, category, timeRange);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getDashboard', () => {
    it('should get dashboard successfully', async () => {
      const tenantId = 'tenant-123';
      const dashboardType = 'executive';

      const result = await service.getDashboard(tenantId, dashboardType);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.type).toBeDefined();
      expect(result.widgets).toBeDefined();
      expect(Array.isArray(result.widgets)).toBe(true);
      expect(result.layout).toBeDefined();
      expect(result.filters).toBeDefined();
      expect(Array.isArray(result.filters)).toBe(true);
      expect(result.permissions).toBeDefined();
    });
  });

  describe('getReports', () => {
    it('should get reports successfully', async () => {
      const tenantId = 'tenant-123';
      const reportType = 'monthly';
      const timeRange = 30;

      const result = await service.getReports(tenantId, reportType, timeRange);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getAlerts', () => {
    it('should get alerts successfully', async () => {
      const tenantId = 'tenant-123';
      const severity = 'high';
      const status = 'open';

      const result = await service.getAlerts(tenantId, severity, status);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getBenchmarks', () => {
    it('should get benchmarks successfully', async () => {
      const tenantId = 'tenant-123';
      const industry = 'logistics';
      const companySize = 'large';

      const result = await service.getBenchmarks(tenantId, industry, companySize);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getTrends', () => {
    it('should get trends successfully', async () => {
      const tenantId = 'tenant-123';
      const metric = 'revenue';
      const timeRange = 90;

      const result = await service.getTrends(tenantId, metric, timeRange);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getComparisons', () => {
    it('should get comparisons successfully', async () => {
      const tenantId = 'tenant-123';
      const comparisonType = 'period_over_period';
      const timeRange = 30;

      const result = await service.getComparisons(tenantId, comparisonType, timeRange);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getForecasts', () => {
    it('should get forecasts successfully', async () => {
      const tenantId = 'tenant-123';
      const metric = 'revenue';
      const forecastPeriod = 30;

      const result = await service.getForecasts(tenantId, metric, forecastPeriod);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should get real-time metrics successfully', async () => {
      const tenantId = 'tenant-123';
      const metric = 'throughput';

      const result = await service.getRealTimeMetrics(tenantId, metric);

      expect(result).toBeDefined();
      expect(result.metric).toBe(metric);
      expect(result.value).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getEfficiencyMetrics', () => {
    it('should get efficiency metrics successfully', async () => {
      const tenantId = 'tenant-123';
      const department = 'logistics';
      const timeRange = 30;

      const result = await service.getEfficiencyMetrics(tenantId, department, timeRange);

      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.trend).toBeDefined();
      expect(result.byDepartment).toBeDefined();
      expect(Array.isArray(result.byDepartment)).toBe(true);
      expect(result.byProcess).toBeDefined();
      expect(Array.isArray(result.byProcess)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('getProductivityMetrics', () => {
    it('should get productivity metrics successfully', async () => {
      const tenantId = 'tenant-123';
      const team = 'warehouse';
      const timeRange = 30;

      const result = await service.getProductivityMetrics(tenantId, team, timeRange);

      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.trend).toBeDefined();
      expect(result.byTeam).toBeDefined();
      expect(Array.isArray(result.byTeam)).toBe(true);
      expect(result.byRole).toBeDefined();
      expect(Array.isArray(result.byRole)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('getQualityMetrics', () => {
    it('should get quality metrics successfully', async () => {
      const tenantId = 'tenant-123';
      const process = 'shipping';
      const timeRange = 30;

      const result = await service.getQualityMetrics(tenantId, process, timeRange);

      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.trend).toBeDefined();
      expect(result.byProcess).toBeDefined();
      expect(Array.isArray(result.byProcess)).toBe(true);
      expect(result.byProduct).toBeDefined();
      expect(Array.isArray(result.byProduct)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('getCostMetrics', () => {
    it('should get cost metrics successfully', async () => {
      const tenantId = 'tenant-123';
      const category = 'operational';
      const timeRange = 30;

      const result = await service.getCostMetrics(tenantId, category, timeRange);

      expect(result).toBeDefined();
      expect(result.totalCost).toBeDefined();
      expect(result.trend).toBeDefined();
      expect(result.byCategory).toBeDefined();
      expect(Array.isArray(result.byCategory)).toBe(true);
      expect(result.byDepartment).toBeDefined();
      expect(Array.isArray(result.byDepartment)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('getCustomerSatisfactionMetrics', () => {
    it('should get customer satisfaction metrics successfully', async () => {
      const tenantId = 'tenant-123';
      const segment = 'enterprise';
      const timeRange = 30;

      const result = await service.getCustomerSatisfactionMetrics(tenantId, segment, timeRange);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeDefined();
      expect(result.trend).toBeDefined();
      expect(result.bySegment).toBeDefined();
      expect(Array.isArray(result.bySegment)).toBe(true);
      expect(result.byService).toBeDefined();
      expect(Array.isArray(result.byService)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('getFinancialMetrics', () => {
    it('should get financial metrics successfully', async () => {
      const tenantId = 'tenant-123';
      const metric = 'revenue';
      const timeRange = 30;

      const result = await service.getFinancialMetrics(tenantId, metric, timeRange);

      expect(result).toBeDefined();
      expect(result.revenue).toBeDefined();
      expect(result.profit).toBeDefined();
      expect(result.margin).toBeDefined();
      expect(result.trend).toBeDefined();
      expect(result.byPeriod).toBeDefined();
      expect(Array.isArray(result.byPeriod)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('getOperationalMetrics', () => {
    it('should get operational metrics successfully', async () => {
      const tenantId = 'tenant-123';
      const operation = 'shipping';
      const timeRange = 30;

      const result = await service.getOperationalMetrics(tenantId, operation, timeRange);

      expect(result).toBeDefined();
      expect(result.throughput).toBeDefined();
      expect(result.utilization).toBeDefined();
      expect(result.availability).toBeDefined();
      expect(result.trend).toBeDefined();
      expect(result.byProcess).toBeDefined();
      expect(Array.isArray(result.byProcess)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('createCustomMetrics', () => {
    it('should create custom metrics successfully', async () => {
      const metricsData = {
        name: 'Custom Efficiency Metric',
        description: 'Custom metric for efficiency calculation',
        formula: 'output / input * 100',
        category: 'efficiency',
      };
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      const result = await service.createCustomMetrics(metricsData, tenantId, userId);

      expect(result).toBeDefined();
      expect(result.name).toBe(metricsData.name);
      expect(result.description).toBe(metricsData.description);
      expect(result.formula).toBe(metricsData.formula);
      expect(result.category).toBe(metricsData.category);
    });
  });

  describe('getCustomMetrics', () => {
    it('should get custom metrics successfully', async () => {
      const tenantId = 'tenant-123';

      const result = await service.getCustomMetrics(tenantId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('updateCustomMetrics', () => {
    it('should update custom metrics successfully', async () => {
      const metricId = 'metric-123';
      const metricsData = {
        name: 'Updated Custom Efficiency Metric',
        description: 'Updated custom metric for efficiency calculation',
        formula: 'output / input * 100',
        category: 'efficiency',
      };
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      const result = await service.updateCustomMetrics(metricId, metricsData, tenantId, userId);

      expect(result).toBeDefined();
      expect(result.id).toBe(metricId);
      expect(result.name).toBe(metricsData.name);
      expect(result.description).toBe(metricsData.description);
    });
  });

  describe('deleteCustomMetrics', () => {
    it('should delete custom metrics successfully', async () => {
      const metricId = 'metric-123';
      const tenantId = 'tenant-123';

      const result = await service.deleteCustomMetrics(metricId, tenantId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics successfully', async () => {
      const tenantId = 'tenant-123';
      const format = 'csv';
      const timeRange = 30;

      const result = await service.exportMetrics(tenantId, format, timeRange);

      expect(result).toBeDefined();
      expect(result.format).toBe(format);
      expect(result.downloadUrl).toBeDefined();
    });
  });

  describe('getInsights', () => {
    it('should get insights successfully', async () => {
      const tenantId = 'tenant-123';
      const category = 'efficiency';

      const result = await service.getInsights(tenantId, category);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getRecommendations', () => {
    it('should get recommendations successfully', async () => {
      const tenantId = 'tenant-123';
      const priority = 'high';

      const result = await service.getRecommendations(tenantId, priority);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.select.mockRejectedValue(new Error('Database connection failed'));

      const tenantId = 'tenant-123';
      const timeRange = 30;
      const department = 'logistics';
      const metricType = 'efficiency';

      await expect(service.getPerformanceMetrics(tenantId, timeRange, department, metricType)).rejects.toThrow();
    });

    it('should handle invalid parameters', async () => {
      const tenantId = '';
      const timeRange = 30;
      const department = 'logistics';
      const metricType = 'efficiency';

      await expect(service.getPerformanceMetrics(tenantId, timeRange, department, metricType)).rejects.toThrow();
    });
  });

  describe('performance', () => {
    it('should complete metrics retrieval within reasonable time', async () => {
      const tenantId = 'tenant-123';
      const timeRange = 30;
      const department = 'logistics';
      const metricType = 'efficiency';

      const startTime = Date.now();
      await service.getPerformanceMetrics(tenantId, timeRange, department, metricType);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
