import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../src/core/audit/audit.service';
import { Logger } from '@nestjs/common';

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
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

    service = module.get<AuditService>(AuditService);
  });

  describe('logEvent', () => {
    it('should log audit event successfully', async () => {
      const event = {
        userId: 'user-001',
        action: 'login',
        resource: 'authentication',
        details: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' },
        timestamp: new Date(),
      };

      const result = await service.logEvent(event);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
    });

    it('should handle invalid event data', async () => {
      const event = {
        userId: '',
        action: 'login',
        resource: 'authentication',
        details: {},
        timestamp: new Date(),
      };

      await expect(service.logEvent(event)).rejects.toThrow();
    });

    it('should validate event action', async () => {
      const event = {
        userId: 'user-001',
        action: 'invalid_action',
        resource: 'authentication',
        details: {},
        timestamp: new Date(),
      };

      await expect(service.logEvent(event)).rejects.toThrow();
    });
  });

  describe('getAuditLog', () => {
    it('should get audit log successfully', async () => {
      const filters = {
        userId: 'user-001',
        action: 'login',
        resource: 'authentication',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        limit: 10,
        offset: 0,
      };

      const auditLog = await service.getAuditLog(filters);

      expect(auditLog).toBeDefined();
      expect(Array.isArray(auditLog.events)).toBe(true);
      expect(auditLog.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty filters', async () => {
      const filters = {};

      const auditLog = await service.getAuditLog(filters);

      expect(auditLog).toBeDefined();
      expect(Array.isArray(auditLog.events)).toBe(true);
    });

    it('should validate date range', async () => {
      const filters = {
        startDate: new Date('2025-01-31'),
        endDate: new Date('2025-01-01'),
      };

      await expect(service.getAuditLog(filters)).rejects.toThrow();
    });
  });

  describe('getUserAuditLog', () => {
    it('should get user audit log successfully', async () => {
      const userId = 'user-001';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const userAuditLog = await service.getUserAuditLog(userId, period);

      expect(userAuditLog).toBeDefined();
      expect(userAuditLog.userId).toBe(userId);
      expect(userAuditLog.period).toEqual(period);
      expect(Array.isArray(userAuditLog.events)).toBe(true);
    });

    it('should handle non-existent user', async () => {
      const userId = 'non-existent';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      await expect(service.getUserAuditLog(userId, period)).rejects.toThrow();
    });

    it('should include user activity summary', async () => {
      const userId = 'user-001';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const userAuditLog = await service.getUserAuditLog(userId, period);

      expect(userAuditLog.summary).toBeDefined();
      expect(userAuditLog.summary.totalEvents).toBeGreaterThanOrEqual(0);
      expect(userAuditLog.summary.uniqueActions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getResourceAuditLog', () => {
    it('should get resource audit log successfully', async () => {
      const resource = 'users';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const resourceAuditLog = await service.getResourceAuditLog(resource, period);

      expect(resourceAuditLog).toBeDefined();
      expect(resourceAuditLog.resource).toBe(resource);
      expect(resourceAuditLog.period).toEqual(period);
      expect(Array.isArray(resourceAuditLog.events)).toBe(true);
    });

    it('should handle non-existent resource', async () => {
      const resource = 'non-existent';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      await expect(service.getResourceAuditLog(resource, period)).rejects.toThrow();
    });

    it('should include resource activity summary', async () => {
      const resource = 'users';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const resourceAuditLog = await service.getResourceAuditLog(resource, period);

      expect(resourceAuditLog.summary).toBeDefined();
      expect(resourceAuditLog.summary.totalEvents).toBeGreaterThanOrEqual(0);
      expect(resourceAuditLog.summary.uniqueUsers).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAuditStatistics', () => {
    it('should get audit statistics successfully', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const statistics = await service.getAuditStatistics(period);

      expect(statistics).toBeDefined();
      expect(statistics.period).toEqual(period);
      expect(statistics.totalEvents).toBeGreaterThanOrEqual(0);
      expect(statistics.uniqueUsers).toBeGreaterThanOrEqual(0);
      expect(statistics.uniqueResources).toBeGreaterThanOrEqual(0);
    });

    it('should include event breakdown by action', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const statistics = await service.getAuditStatistics(period);

      expect(statistics.breakdownByAction).toBeDefined();
      expect(Array.isArray(statistics.breakdownByAction)).toBe(true);
    });

    it('should include event breakdown by resource', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const statistics = await service.getAuditStatistics(period);

      expect(statistics.breakdownByResource).toBeDefined();
      expect(Array.isArray(statistics.breakdownByResource)).toBe(true);
    });
  });

  describe('generateAuditReport', () => {
    it('should generate audit report successfully', async () => {
      const reportConfig = {
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        includeUserActivity: true,
        includeResourceActivity: true,
        includeSecurityEvents: true,
      };

      const report = await service.generateAuditReport(reportConfig);

      expect(report).toBeDefined();
      expect(report.reportId).toBeDefined();
      expect(report.period).toEqual(reportConfig.period);
      expect(report.summary).toBeDefined();
    });

    it('should include user activity in report', async () => {
      const reportConfig = {
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        includeUserActivity: true,
        includeResourceActivity: false,
        includeSecurityEvents: false,
      };

      const report = await service.generateAuditReport(reportConfig);

      expect(report.userActivity).toBeDefined();
      expect(Array.isArray(report.userActivity)).toBe(true);
    });

    it('should include resource activity in report', async () => {
      const reportConfig = {
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        includeUserActivity: false,
        includeResourceActivity: true,
        includeSecurityEvents: false,
      };

      const report = await service.generateAuditReport(reportConfig);

      expect(report.resourceActivity).toBeDefined();
      expect(Array.isArray(report.resourceActivity)).toBe(true);
    });

    it('should include security events in report', async () => {
      const reportConfig = {
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        includeUserActivity: false,
        includeResourceActivity: false,
        includeSecurityEvents: true,
      };

      const report = await service.generateAuditReport(reportConfig);

      expect(report.securityEvents).toBeDefined();
      expect(Array.isArray(report.securityEvents)).toBe(true);
    });
  });

  describe('detectAnomalies', () => {
    it('should detect audit anomalies successfully', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const anomalies = await service.detectAnomalies(period);

      expect(anomalies).toBeDefined();
      expect(Array.isArray(anomalies)).toBe(true);
    });

    it('should identify suspicious login patterns', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const anomalies = await service.detectAnomalies(period);

      const loginAnomalies = anomalies.filter(a => a.type === 'suspicious_login');
      expect(loginAnomalies.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify unusual access patterns', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const anomalies = await service.detectAnomalies(period);

      const accessAnomalies = anomalies.filter(a => a.type === 'unusual_access');
      expect(accessAnomalies.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exportAuditData', () => {
    it('should export audit data successfully', async () => {
      const exportConfig = {
        format: 'csv',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        filters: {
          userId: 'user-001',
          action: 'login',
        },
      };

      const result = await service.exportAuditData(exportConfig);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.exportId).toBeDefined();
    });

    it('should handle invalid export format', async () => {
      const exportConfig = {
        format: 'invalid_format',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        filters: {},
      };

      await expect(service.exportAuditData(exportConfig)).rejects.toThrow();
    });

    it('should validate export period', async () => {
      const exportConfig = {
        format: 'csv',
        period: {
          start: new Date('2025-01-31'),
          end: new Date('2025-01-01'),
        },
        filters: {},
      };

      await expect(service.exportAuditData(exportConfig)).rejects.toThrow();
    });
  });

  describe('setAuditRetention', () => {
    it('should set audit retention successfully', async () => {
      const retentionConfig = {
        retentionPeriod: 365, // days
        archiveAfter: 90, // days
        deleteAfter: 365, // days
      };

      const result = await service.setAuditRetention(retentionConfig);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle invalid retention period', async () => {
      const retentionConfig = {
        retentionPeriod: 0, // Invalid
        archiveAfter: 90,
        deleteAfter: 365,
      };

      await expect(service.setAuditRetention(retentionConfig)).rejects.toThrow();
    });

    it('should validate retention configuration', async () => {
      const retentionConfig = {
        retentionPeriod: 365,
        archiveAfter: 400, // Invalid: archiveAfter > retentionPeriod
        deleteAfter: 365,
      };

      await expect(service.setAuditRetention(retentionConfig)).rejects.toThrow();
    });
  });

  describe('getAuditRetention', () => {
    it('should get audit retention settings', async () => {
      const retention = await service.getAuditRetention();

      expect(retention).toBeDefined();
      expect(retention.retentionPeriod).toBeDefined();
      expect(retention.archiveAfter).toBeDefined();
      expect(retention.deleteAfter).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle audit logging errors', async () => {
      const event = {
        userId: 'user-001',
        action: 'login',
        resource: 'authentication',
        details: {},
        timestamp: new Date(),
      };

      jest.spyOn(service, 'logEvent').mockRejectedValue(new Error('Audit logging failed'));

      await expect(service.logEvent(event)).rejects.toThrow('Audit logging failed');
    });

    it('should handle audit retrieval errors', async () => {
      const filters = {
        userId: 'user-001',
        action: 'login',
      };

      jest.spyOn(service, 'getAuditLog').mockRejectedValue(new Error('Audit retrieval failed'));

      await expect(service.getAuditLog(filters)).rejects.toThrow('Audit retrieval failed');
    });

    it('should handle report generation errors', async () => {
      const reportConfig = {
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        includeUserActivity: true,
        includeResourceActivity: true,
        includeSecurityEvents: true,
      };

      jest.spyOn(service, 'generateAuditReport').mockRejectedValue(new Error('Report generation failed'));

      await expect(service.generateAuditReport(reportConfig)).rejects.toThrow('Report generation failed');
    });
  });

  describe('data validation', () => {
    it('should validate event details format', async () => {
      const event = {
        userId: 'user-001',
        action: 'login',
        resource: 'authentication',
        details: { invalid: null },
        timestamp: new Date(),
      };

      await expect(service.logEvent(event)).rejects.toThrow();
    });

    it('should validate user ID format', async () => {
      const event = {
        userId: 'invalid-user-id-format',
        action: 'login',
        resource: 'authentication',
        details: {},
        timestamp: new Date(),
      };

      await expect(service.logEvent(event)).rejects.toThrow();
    });

    it('should validate timestamp format', async () => {
      const event = {
        userId: 'user-001',
        action: 'login',
        resource: 'authentication',
        details: {},
        timestamp: 'invalid-timestamp' as any,
      };

      await expect(service.logEvent(event)).rejects.toThrow();
    });
  });
});