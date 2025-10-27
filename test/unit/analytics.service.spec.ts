import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../../src/core/analytics/analytics.service';
import { Logger } from '@nestjs/common';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('trackEvent', () => {
    it('should track event successfully', async () => {
      const event = {
        userId: 'user-001',
        eventType: 'page_view',
        properties: { page: '/dashboard', duration: 120 },
        timestamp: new Date(),
      };

      const result = await service.trackEvent(event);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
    });

    it('should handle invalid event data', async () => {
      const event = {
        userId: '',
        eventType: 'page_view',
        properties: {},
        timestamp: new Date(),
      };

      await expect(service.trackEvent(event)).rejects.toThrow();
    });

    it('should validate event type', async () => {
      const event = {
        userId: 'user-001',
        eventType: 'invalid_type',
        properties: {},
        timestamp: new Date(),
      };

      await expect(service.trackEvent(event)).rejects.toThrow();
    });
  });

  describe('getUserAnalytics', () => {
    it('should get user analytics successfully', async () => {
      const userId = 'user-001';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const analytics = await service.getUserAnalytics(userId, period);

      expect(analytics).toBeDefined();
      expect(analytics.userId).toBe(userId);
      expect(analytics.period).toEqual(period);
      expect(analytics.totalEvents).toBeGreaterThanOrEqual(0);
    });

    it('should handle non-existent user', async () => {
      const userId = 'non-existent';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      await expect(service.getUserAnalytics(userId, period)).rejects.toThrow();
    });

    it('should validate date range', async () => {
      const userId = 'user-001';
      const invalidPeriod = {
        start: new Date('2025-01-31'),
        end: new Date('2025-01-01'),
      };

      await expect(service.getUserAnalytics(userId, invalidPeriod)).rejects.toThrow();
    });
  });

  describe('getDashboardMetrics', () => {
    it('should get dashboard metrics successfully', async () => {
      const tenantId = 'tenant-001';
      const metrics = await service.getDashboardMetrics(tenantId);

      expect(metrics).toBeDefined();
      expect(metrics.tenantId).toBe(tenantId);
      expect(metrics.totalUsers).toBeGreaterThanOrEqual(0);
      expect(metrics.activeUsers).toBeGreaterThanOrEqual(0);
      expect(metrics.totalEvents).toBeGreaterThanOrEqual(0);
    });

    it('should include real-time metrics', async () => {
      const tenantId = 'tenant-001';
      const metrics = await service.getDashboardMetrics(tenantId);

      expect(metrics.realTime).toBeDefined();
      expect(metrics.realTime.onlineUsers).toBeGreaterThanOrEqual(0);
      expect(metrics.realTime.eventsPerMinute).toBeGreaterThanOrEqual(0);
    });

    it('should include trend data', async () => {
      const tenantId = 'tenant-001';
      const metrics = await service.getDashboardMetrics(tenantId);

      expect(metrics.trends).toBeDefined();
      expect(Array.isArray(metrics.trends)).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('should generate report successfully', async () => {
      const reportConfig = {
        tenantId: 'tenant-001',
        reportType: 'user_activity',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        filters: {
          userRole: 'admin',
          eventType: 'login',
        },
      };

      const report = await service.generateReport(reportConfig);

      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.reportType).toBe(reportConfig.reportType);
      expect(report.data).toBeDefined();
    });

    it('should handle invalid report configuration', async () => {
      const reportConfig = {
        tenantId: '',
        reportType: 'invalid_type',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        filters: {},
      };

      await expect(service.generateReport(reportConfig)).rejects.toThrow();
    });

    it('should validate report period', async () => {
      const reportConfig = {
        tenantId: 'tenant-001',
        reportType: 'user_activity',
        period: {
          start: new Date('2025-01-31'),
          end: new Date('2025-01-01'),
        },
        filters: {},
      };

      await expect(service.generateReport(reportConfig)).rejects.toThrow();
    });
  });

  describe('getEventStream', () => {
    it('should get event stream successfully', async () => {
      const tenantId = 'tenant-001';
      const filters = {
        eventType: 'page_view',
        userId: 'user-001',
      };

      const stream = await service.getEventStream(tenantId, filters);

      expect(stream).toBeDefined();
      expect(Array.isArray(stream.events)).toBe(true);
      expect(stream.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty filters', async () => {
      const tenantId = 'tenant-001';
      const filters = {};

      const stream = await service.getEventStream(tenantId, filters);

      expect(stream).toBeDefined();
      expect(Array.isArray(stream.events)).toBe(true);
    });

    it('should validate tenant ID', async () => {
      const tenantId = '';
      const filters = {};

      await expect(service.getEventStream(tenantId, filters)).rejects.toThrow();
    });
  });

  describe('getConversionFunnel', () => {
    it('should get conversion funnel successfully', async () => {
      const tenantId = 'tenant-001';
      const funnelConfig = {
        steps: ['page_view', 'signup', 'purchase'],
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
      };

      const funnel = await service.getConversionFunnel(tenantId, funnelConfig);

      expect(funnel).toBeDefined();
      expect(funnel.steps).toHaveLength(3);
      expect(funnel.conversionRates).toBeDefined();
    });

    it('should handle invalid funnel steps', async () => {
      const tenantId = 'tenant-001';
      const funnelConfig = {
        steps: [],
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
      };

      await expect(service.getConversionFunnel(tenantId, funnelConfig)).rejects.toThrow();
    });

    it('should calculate conversion rates correctly', async () => {
      const tenantId = 'tenant-001';
      const funnelConfig = {
        steps: ['page_view', 'signup', 'purchase'],
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
      };

      const funnel = await service.getConversionFunnel(tenantId, funnelConfig);

      expect(funnel.conversionRates).toBeDefined();
      expect(Array.isArray(funnel.conversionRates)).toBe(true);
      funnel.conversionRates.forEach(rate => {
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('getCohortAnalysis', () => {
    it('should get cohort analysis successfully', async () => {
      const tenantId = 'tenant-001';
      const cohortConfig = {
        cohortType: 'user_registration',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        metric: 'retention',
      };

      const cohort = await service.getCohortAnalysis(tenantId, cohortConfig);

      expect(cohort).toBeDefined();
      expect(cohort.cohortType).toBe(cohortConfig.cohortType);
      expect(cohort.data).toBeDefined();
    });

    it('should handle invalid cohort type', async () => {
      const tenantId = 'tenant-001';
      const cohortConfig = {
        cohortType: 'invalid_type',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        metric: 'retention',
      };

      await expect(service.getCohortAnalysis(tenantId, cohortConfig)).rejects.toThrow();
    });

    it('should validate cohort metric', async () => {
      const tenantId = 'tenant-001';
      const cohortConfig = {
        cohortType: 'user_registration',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        metric: 'invalid_metric',
      };

      await expect(service.getCohortAnalysis(tenantId, cohortConfig)).rejects.toThrow();
    });
  });

  describe('getA/BTestResults', () => {
    it('should get A/B test results successfully', async () => {
      const testId = 'test-001';
      const results = await service.getABTestResults(testId);

      expect(results).toBeDefined();
      expect(results.testId).toBe(testId);
      expect(results.variants).toBeDefined();
      expect(Array.isArray(results.variants)).toBe(true);
    });

    it('should handle non-existent test', async () => {
      const testId = 'non-existent';

      await expect(service.getABTestResults(testId)).rejects.toThrow();
    });

    it('should include statistical significance', async () => {
      const testId = 'test-001';
      const results = await service.getABTestResults(testId);

      expect(results.statisticalSignificance).toBeDefined();
      expect(results.statisticalSignificance).toBeGreaterThanOrEqual(0);
      expect(results.statisticalSignificance).toBeLessThanOrEqual(100);
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should get real-time metrics successfully', async () => {
      const tenantId = 'tenant-001';
      const metrics = await service.getRealTimeMetrics(tenantId);

      expect(metrics).toBeDefined();
      expect(metrics.tenantId).toBe(tenantId);
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.activeUsers).toBeGreaterThanOrEqual(0);
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(0);
    });

    it('should include event breakdown', async () => {
      const tenantId = 'tenant-001';
      const metrics = await service.getRealTimeMetrics(tenantId);

      expect(metrics.eventBreakdown).toBeDefined();
      expect(Array.isArray(metrics.eventBreakdown)).toBe(true);
    });

    it('should include geographic data', async () => {
      const tenantId = 'tenant-001';
      const metrics = await service.getRealTimeMetrics(tenantId);

      expect(metrics.geographicData).toBeDefined();
      expect(Array.isArray(metrics.geographicData)).toBe(true);
    });
  });

  describe('exportData', () => {
    it('should export data successfully', async () => {
      const exportConfig = {
        tenantId: 'tenant-001',
        dataType: 'events',
        format: 'csv',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
      };

      const exportResult = await service.exportData(exportConfig);

      expect(exportResult).toBeDefined();
      expect(exportResult.exportId).toBeDefined();
      expect(exportResult.status).toBe('completed');
    });

    it('should handle invalid export format', async () => {
      const exportConfig = {
        tenantId: 'tenant-001',
        dataType: 'events',
        format: 'invalid_format',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
      };

      await expect(service.exportData(exportConfig)).rejects.toThrow();
    });

    it('should validate export period', async () => {
      const exportConfig = {
        tenantId: 'tenant-001',
        dataType: 'events',
        format: 'csv',
        period: {
          start: new Date('2025-01-31'),
          end: new Date('2025-01-01'),
        },
      };

      await expect(service.exportData(exportConfig)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      const event = {
        userId: 'user-001',
        eventType: 'page_view',
        properties: {},
        timestamp: new Date(),
      };

      jest.spyOn(service, 'trackEvent').mockRejectedValue(new Error('Database connection failed'));

      await expect(service.trackEvent(event)).rejects.toThrow('Database connection failed');
    });

    it('should handle data processing errors', async () => {
      const tenantId = 'tenant-001';
      jest.spyOn(service, 'getDashboardMetrics').mockRejectedValue(new Error('Data processing failed'));

      await expect(service.getDashboardMetrics(tenantId)).rejects.toThrow('Data processing failed');
    });

    it('should handle report generation errors', async () => {
      const reportConfig = {
        tenantId: 'tenant-001',
        reportType: 'user_activity',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        filters: {},
      };

      jest.spyOn(service, 'generateReport').mockRejectedValue(new Error('Report generation failed'));

      await expect(service.generateReport(reportConfig)).rejects.toThrow('Report generation failed');
    });
  });

  describe('data validation', () => {
    it('should validate event properties', async () => {
      const event = {
        userId: 'user-001',
        eventType: 'page_view',
        properties: { invalid: null },
        timestamp: new Date(),
      };

      await expect(service.trackEvent(event)).rejects.toThrow();
    });

    it('should validate user ID format', async () => {
      const event = {
        userId: 'invalid-user-id-format',
        eventType: 'page_view',
        properties: {},
        timestamp: new Date(),
      };

      await expect(service.trackEvent(event)).rejects.toThrow();
    });

    it('should validate timestamp format', async () => {
      const event = {
        userId: 'user-001',
        eventType: 'page_view',
        properties: {},
        timestamp: 'invalid-timestamp' as any,
      };

      await expect(service.trackEvent(event)).rejects.toThrow();
    });
  });
});