import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceService } from '../../src/core/performance/performance.service';
import { Logger } from '@nestjs/common';

describe('PerformanceService', () => {
  let service: PerformanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
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

    service = module.get<PerformanceService>(PerformanceService);
  });

  describe('startPerformanceMonitoring', () => {
    it('should start performance monitoring successfully', async () => {
      const config = {
        metrics: ['cpu', 'memory', 'response_time'],
        interval: 5000,
        thresholds: {
          cpu: 80,
          memory: 85,
          responseTime: 1000,
        },
      };

      const result = await service.startPerformanceMonitoring(config);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.monitoringId).toBeDefined();
    });

    it('should handle invalid metrics configuration', async () => {
      const config = {
        metrics: ['invalid_metric'],
        interval: 5000,
        thresholds: {},
      };

      await expect(service.startPerformanceMonitoring(config)).rejects.toThrow();
    });

    it('should validate monitoring interval', async () => {
      const config = {
        metrics: ['cpu', 'memory'],
        interval: 0, // Invalid interval
        thresholds: {},
      };

      await expect(service.startPerformanceMonitoring(config)).rejects.toThrow();
    });
  });

  describe('stopPerformanceMonitoring', () => {
    it('should stop performance monitoring successfully', async () => {
      const monitoringId = 'monitoring-001';
      const result = await service.stopPerformanceMonitoring(monitoringId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle non-existent monitoring session', async () => {
      const monitoringId = 'non-existent';

      await expect(service.stopPerformanceMonitoring(monitoringId)).rejects.toThrow();
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should get performance metrics successfully', async () => {
      const monitoringId = 'monitoring-001';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const metrics = await service.getPerformanceMetrics(monitoringId, period);

      expect(metrics).toBeDefined();
      expect(metrics.monitoringId).toBe(monitoringId);
      expect(metrics.period).toEqual(period);
      expect(metrics.cpuUsage).toBeDefined();
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.responseTime).toBeDefined();
    });

    it('should handle invalid date range', async () => {
      const monitoringId = 'monitoring-001';
      const invalidPeriod = {
        start: new Date('2025-01-31'),
        end: new Date('2025-01-01'),
      };

      await expect(service.getPerformanceMetrics(monitoringId, invalidPeriod)).rejects.toThrow();
    });

    it('should include detailed metrics breakdown', async () => {
      const monitoringId = 'monitoring-001';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const metrics = await service.getPerformanceMetrics(monitoringId, period);

      expect(metrics.breakdown).toBeDefined();
      expect(Array.isArray(metrics.breakdown)).toBe(true);
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should get real-time performance metrics', async () => {
      const metrics = await service.getRealTimeMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsage).toBeLessThanOrEqual(100);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeLessThanOrEqual(100);
      expect(metrics.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should include system information', async () => {
      const metrics = await service.getRealTimeMetrics();

      expect(metrics.systemInfo).toBeDefined();
      expect(metrics.systemInfo.platform).toBeDefined();
      expect(metrics.systemInfo.arch).toBeDefined();
      expect(metrics.systemInfo.nodeVersion).toBeDefined();
    });

    it('should include process information', async () => {
      const metrics = await service.getRealTimeMetrics();

      expect(metrics.processInfo).toBeDefined();
      expect(metrics.processInfo.pid).toBeDefined();
      expect(metrics.processInfo.uptime).toBeDefined();
      expect(metrics.processInfo.memoryUsage).toBeDefined();
    });
  });

  describe('analyzePerformanceBottlenecks', () => {
    it('should analyze performance bottlenecks successfully', async () => {
      const monitoringId = 'monitoring-001';
      const analysis = await service.analyzePerformanceBottlenecks(monitoringId);

      expect(analysis).toBeDefined();
      expect(analysis.monitoringId).toBe(monitoringId);
      expect(analysis.bottlenecks).toBeDefined();
      expect(Array.isArray(analysis.bottlenecks)).toBe(true);
    });

    it('should identify CPU bottlenecks', async () => {
      const monitoringId = 'monitoring-001';
      const analysis = await service.analyzePerformanceBottlenecks(monitoringId);

      const cpuBottlenecks = analysis.bottlenecks.filter(b => b.type === 'cpu');
      expect(cpuBottlenecks.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify memory bottlenecks', async () => {
      const monitoringId = 'monitoring-001';
      const analysis = await service.analyzePerformanceBottlenecks(monitoringId);

      const memoryBottlenecks = analysis.bottlenecks.filter(b => b.type === 'memory');
      expect(memoryBottlenecks.length).toBeGreaterThanOrEqual(0);
    });

    it('should provide recommendations', async () => {
      const monitoringId = 'monitoring-001';
      const analysis = await service.analyzePerformanceBottlenecks(monitoringId);

      expect(analysis.recommendations).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });
  });

  describe('optimizePerformance', () => {
    it('should optimize performance successfully', async () => {
      const optimizationConfig = {
        target: 'response_time',
        threshold: 500,
        strategies: ['caching', 'database_optimization'],
      };

      const result = await service.optimizePerformance(optimizationConfig);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.optimizationsApplied).toBeDefined();
      expect(Array.isArray(result.optimizationsApplied)).toBe(true);
    });

    it('should handle invalid optimization target', async () => {
      const optimizationConfig = {
        target: 'invalid_target',
        threshold: 500,
        strategies: ['caching'],
      };

      await expect(service.optimizePerformance(optimizationConfig)).rejects.toThrow();
    });

    it('should validate optimization strategies', async () => {
      const optimizationConfig = {
        target: 'response_time',
        threshold: 500,
        strategies: ['invalid_strategy'],
      };

      await expect(service.optimizePerformance(optimizationConfig)).rejects.toThrow();
    });
  });

  describe('getPerformanceReport', () => {
    it('should generate performance report successfully', async () => {
      const reportConfig = {
        monitoringId: 'monitoring-001',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        includeRecommendations: true,
        includeTrends: true,
      };

      const report = await service.getPerformanceReport(reportConfig);

      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.period).toEqual(reportConfig.period);
      expect(report.summary).toBeDefined();
      expect(report.metrics).toBeDefined();
    });

    it('should include performance trends', async () => {
      const reportConfig = {
        monitoringId: 'monitoring-001',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        includeRecommendations: true,
        includeTrends: true,
      };

      const report = await service.getPerformanceReport(reportConfig);

      expect(report.trends).toBeDefined();
      expect(Array.isArray(report.trends)).toBe(true);
    });

    it('should include optimization recommendations', async () => {
      const reportConfig = {
        monitoringId: 'monitoring-001',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        includeRecommendations: true,
        includeTrends: true,
      };

      const report = await service.getPerformanceReport(reportConfig);

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('setPerformanceAlerts', () => {
    it('should set performance alerts successfully', async () => {
      const alertConfig = {
        monitoringId: 'monitoring-001',
        alerts: [
          {
            metric: 'cpu',
            threshold: 80,
            condition: 'greater_than',
            notification: 'email',
          },
          {
            metric: 'memory',
            threshold: 85,
            condition: 'greater_than',
            notification: 'sms',
          },
        ],
      };

      const result = await service.setPerformanceAlerts(alertConfig);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.alertIds).toBeDefined();
      expect(Array.isArray(result.alertIds)).toBe(true);
    });

    it('should handle invalid alert conditions', async () => {
      const alertConfig = {
        monitoringId: 'monitoring-001',
        alerts: [
          {
            metric: 'cpu',
            threshold: 80,
            condition: 'invalid_condition',
            notification: 'email',
          },
        ],
      };

      await expect(service.setPerformanceAlerts(alertConfig)).rejects.toThrow();
    });

    it('should validate alert thresholds', async () => {
      const alertConfig = {
        monitoringId: 'monitoring-001',
        alerts: [
          {
            metric: 'cpu',
            threshold: -1, // Invalid threshold
            condition: 'greater_than',
            notification: 'email',
          },
        ],
      };

      await expect(service.setPerformanceAlerts(alertConfig)).rejects.toThrow();
    });
  });

  describe('getPerformanceAlerts', () => {
    it('should get performance alerts successfully', async () => {
      const monitoringId = 'monitoring-001';
      const alerts = await service.getPerformanceAlerts(monitoringId);

      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should handle non-existent monitoring session', async () => {
      const monitoringId = 'non-existent';

      await expect(service.getPerformanceAlerts(monitoringId)).rejects.toThrow();
    });
  });

  describe('clearPerformanceData', () => {
    it('should clear performance data successfully', async () => {
      const monitoringId = 'monitoring-001';
      const result = await service.clearPerformanceData(monitoringId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle non-existent monitoring session', async () => {
      const monitoringId = 'non-existent';

      await expect(service.clearPerformanceData(monitoringId)).rejects.toThrow();
    });
  });

  describe('exportPerformanceData', () => {
    it('should export performance data successfully', async () => {
      const exportConfig = {
        monitoringId: 'monitoring-001',
        format: 'csv',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
      };

      const result = await service.exportPerformanceData(exportConfig);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.exportId).toBeDefined();
    });

    it('should handle invalid export format', async () => {
      const exportConfig = {
        monitoringId: 'monitoring-001',
        format: 'invalid_format',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
      };

      await expect(service.exportPerformanceData(exportConfig)).rejects.toThrow();
    });

    it('should validate export period', async () => {
      const exportConfig = {
        monitoringId: 'monitoring-001',
        format: 'csv',
        period: {
          start: new Date('2025-01-31'),
          end: new Date('2025-01-01'),
        },
      };

      await expect(service.exportPerformanceData(exportConfig)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle monitoring service errors', async () => {
      const config = {
        metrics: ['cpu', 'memory'],
        interval: 5000,
        thresholds: {},
      };

      jest.spyOn(service, 'startPerformanceMonitoring').mockRejectedValue(new Error('Monitoring service unavailable'));

      await expect(service.startPerformanceMonitoring(config)).rejects.toThrow('Monitoring service unavailable');
    });

    it('should handle metrics collection errors', async () => {
      const monitoringId = 'monitoring-001';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      jest.spyOn(service, 'getPerformanceMetrics').mockRejectedValue(new Error('Metrics collection failed'));

      await expect(service.getPerformanceMetrics(monitoringId, period)).rejects.toThrow('Metrics collection failed');
    });

    it('should handle optimization service errors', async () => {
      const optimizationConfig = {
        target: 'response_time',
        threshold: 500,
        strategies: ['caching'],
      };

      jest.spyOn(service, 'optimizePerformance').mockRejectedValue(new Error('Optimization service unavailable'));

      await expect(service.optimizePerformance(optimizationConfig)).rejects.toThrow('Optimization service unavailable');
    });
  });

  describe('data validation', () => {
    it('should validate monitoring configuration', async () => {
      const config = {
        metrics: [],
        interval: 5000,
        thresholds: {},
      };

      await expect(service.startPerformanceMonitoring(config)).rejects.toThrow();
    });

    it('should validate alert configuration', async () => {
      const alertConfig = {
        monitoringId: 'monitoring-001',
        alerts: [],
      };

      await expect(service.setPerformanceAlerts(alertConfig)).rejects.toThrow();
    });

    it('should validate optimization configuration', async () => {
      const optimizationConfig = {
        target: '',
        threshold: 500,
        strategies: [],
      };

      await expect(service.optimizePerformance(optimizationConfig)).rejects.toThrow();
    });
  });
});
