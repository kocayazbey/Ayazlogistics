import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { 
  Audit, AuditCreate, AuditRead, AuditUpdate, AuditDelete,
  RateLimit, RateLimitAPI, RateLimitAuth,
  Performance, PerformanceTrack, PerformanceFull,
  Security, SecurityStrict, SecurityModerate,
  Monitoring, MonitoringFull, MonitoringPerformance,
  Analytics, AnalyticsBusiness, AnalyticsTechnical,
  Tenant, TenantRequired, TenantIsolated,
  Validation, ValidationStrict, ValidationLoose
} from '../../src/common/decorators';

describe('Comprehensive Decorators', () => {
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Reflector],
    }).compile();

    reflector = module.get<Reflector>(Reflector);
  });

  describe('Audit Decorators', () => {
    it('should apply audit decorator with options', () => {
      class TestController {
        @Audit({ action: 'CREATE', resource: 'test', level: 'DETAILED' })
        test() {}
      }

      const metadata = reflector.get('audit_action', TestController.prototype.test);
      expect(metadata).toBe('CREATE');
    });

    it('should apply audit create decorator', () => {
      class TestController {
        @AuditCreate('test')
        test() {}
      }

      const action = reflector.get('audit_action', TestController.prototype.test);
      const resource = reflector.get('audit_resource', TestController.prototype.test);
      expect(action).toBe('CREATE');
      expect(resource).toBe('test');
    });

    it('should apply audit read decorator', () => {
      class TestController {
        @AuditRead('test')
        test() {}
      }

      const action = reflector.get('audit_action', TestController.prototype.test);
      const resource = reflector.get('audit_resource', TestController.prototype.test);
      expect(action).toBe('READ');
      expect(resource).toBe('test');
    });
  });

  describe('Rate Limit Decorators', () => {
    it('should apply rate limit decorator with options', () => {
      class TestController {
        @RateLimit({ requests: 100, windowMs: 60000 })
        test() {}
      }

      const isRateLimited = reflector.get('rate_limit', TestController.prototype.test);
      const options = reflector.get('rate_limit_options', TestController.prototype.test);
      expect(isRateLimited).toBe(true);
      expect(options.requests).toBe(100);
      expect(options.windowMs).toBe(60000);
    });

    it('should apply rate limit API decorator', () => {
      class TestController {
        @RateLimitAPI()
        test() {}
      }

      const isRateLimited = reflector.get('rate_limit', TestController.prototype.test);
      expect(isRateLimited).toBe(true);
    });
  });

  describe('Performance Decorators', () => {
    it('should apply performance decorator with options', () => {
      class TestController {
        @Performance({ trackExecutionTime: true, alertThreshold: 5000 })
        test() {}
      }

      const isPerformanceTracked = reflector.get('performance', TestController.prototype.test);
      const options = reflector.get('performance_options', TestController.prototype.test);
      expect(isPerformanceTracked).toBe(true);
      expect(options.trackExecutionTime).toBe(true);
      expect(options.alertThreshold).toBe(5000);
    });

    it('should apply performance track decorator', () => {
      class TestController {
        @PerformanceTrack()
        test() {}
      }

      const isPerformanceTracked = reflector.get('performance', TestController.prototype.test);
      expect(isPerformanceTracked).toBe(true);
    });
  });

  describe('Security Decorators', () => {
    it('should apply security decorator with options', () => {
      class TestController {
        @Security({ level: 'strict', requireHttps: true, requireAuth: true })
        test() {}
      }

      const isSecurityEnabled = reflector.get('security', TestController.prototype.test);
      const options = reflector.get('security_options', TestController.prototype.test);
      expect(isSecurityEnabled).toBe(true);
      expect(options.level).toBe('strict');
      expect(options.requireHttps).toBe(true);
    });

    it('should apply security strict decorator', () => {
      class TestController {
        @SecurityStrict()
        test() {}
      }

      const isSecurityEnabled = reflector.get('security', TestController.prototype.test);
      expect(isSecurityEnabled).toBe(true);
    });
  });

  describe('Monitoring Decorators', () => {
    it('should apply monitoring decorator with options', () => {
      class TestController {
        @Monitoring({ trackMetrics: true, trackHealth: true })
        test() {}
      }

      const isMonitoringEnabled = reflector.get('monitoring', TestController.prototype.test);
      const options = reflector.get('monitoring_options', TestController.prototype.test);
      expect(isMonitoringEnabled).toBe(true);
      expect(options.trackMetrics).toBe(true);
      expect(options.trackHealth).toBe(true);
    });

    it('should apply monitoring full decorator', () => {
      class TestController {
        @MonitoringFull()
        test() {}
      }

      const isMonitoringEnabled = reflector.get('monitoring', TestController.prototype.test);
      expect(isMonitoringEnabled).toBe(true);
    });
  });

  describe('Analytics Decorators', () => {
    it('should apply analytics decorator with options', () => {
      class TestController {
        @Analytics({ trackBusinessMetrics: true, trackTechnicalMetrics: true })
        test() {}
      }

      const isAnalyticsEnabled = reflector.get('analytics', TestController.prototype.test);
      const options = reflector.get('analytics_options', TestController.prototype.test);
      expect(isAnalyticsEnabled).toBe(true);
      expect(options.trackBusinessMetrics).toBe(true);
      expect(options.trackTechnicalMetrics).toBe(true);
    });

    it('should apply analytics business decorator', () => {
      class TestController {
        @AnalyticsBusiness()
        test() {}
      }

      const isAnalyticsEnabled = reflector.get('analytics', TestController.prototype.test);
      expect(isAnalyticsEnabled).toBe(true);
    });
  });

  describe('Tenant Decorators', () => {
    it('should apply tenant decorator with options', () => {
      class TestController {
        @Tenant({ isolationLevel: 'strict', requireTenantId: true })
        test() {}
      }

      const isTenantEnabled = reflector.get('tenant', TestController.prototype.test);
      const options = reflector.get('tenant_options', TestController.prototype.test);
      expect(isTenantEnabled).toBe(true);
      expect(options.isolationLevel).toBe('strict');
      expect(options.requireTenantId).toBe(true);
    });

    it('should apply tenant required decorator', () => {
      class TestController {
        @TenantRequired()
        test() {}
      }

      const isTenantEnabled = reflector.get('tenant', TestController.prototype.test);
      expect(isTenantEnabled).toBe(true);
    });
  });

  describe('Validation Decorators', () => {
    it('should apply validation decorator with options', () => {
      class TestController {
        @Validation({ strict: true, sanitize: true })
        test() {}
      }

      const isValidationEnabled = reflector.get('validation', TestController.prototype.test);
      const options = reflector.get('validation_options', TestController.prototype.test);
      expect(isValidationEnabled).toBe(true);
      expect(options.strict).toBe(true);
      expect(options.sanitize).toBe(true);
    });

    it('should apply validation strict decorator', () => {
      class TestController {
        @ValidationStrict()
        test() {}
      }

      const isValidationEnabled = reflector.get('validation', TestController.prototype.test);
      expect(isValidationEnabled).toBe(true);
    });
  });
});
