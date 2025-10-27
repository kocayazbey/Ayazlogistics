import { Test, TestingModule } from '@nestjs/testing';
import { ComprehensiveSecurityService } from '../../src/common/services/comprehensive-security.service';
import { ComprehensiveAuditService } from '../../src/common/services/comprehensive-audit.service';
import { ComprehensiveMonitoringService } from '../../src/common/services/comprehensive-monitoring.service';
import { ComprehensiveAnalyticsService } from '../../src/common/services/comprehensive-analytics.service';

describe('Comprehensive Services', () => {
  let module: TestingModule;
  let securityService: ComprehensiveSecurityService;
  let auditService: ComprehensiveAuditService;
  let monitoringService: ComprehensiveMonitoringService;
  let analyticsService: ComprehensiveAnalyticsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ComprehensiveSecurityService,
        ComprehensiveAuditService,
        ComprehensiveMonitoringService,
        ComprehensiveAnalyticsService,
      ],
    }).compile();

    securityService = module.get<ComprehensiveSecurityService>(ComprehensiveSecurityService);
    auditService = module.get<ComprehensiveAuditService>(ComprehensiveAuditService);
    monitoringService = module.get<ComprehensiveMonitoringService>(ComprehensiveMonitoringService);
    analyticsService = module.get<ComprehensiveAnalyticsService>(ComprehensiveAnalyticsService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('ComprehensiveSecurityService', () => {
    it('should sanitize input to prevent XSS attacks', () => {
      const maliciousInput = '<script>alert("XSS")</script>Hello World';
      const sanitized = securityService.sanitizeInput(maliciousInput);
      expect(sanitized).toBe('Hello World');
    });

    it('should sanitize JSON object recursively', () => {
      const maliciousObject = {
        name: '<script>alert("XSS")</script>John',
        description: 'Hello <iframe src="evil.com"></iframe>',
        nested: {
          value: '<script>alert("XSS")</script>Value'
        }
      };
      
      const sanitized = securityService.sanitizeJSON(maliciousObject);
      expect(sanitized.name).toBe('John');
      expect(sanitized.description).toBe('Hello ');
      expect(sanitized.nested.value).toBe('Value');
    });

    it('should detect SQL injection attempts', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const isDetected = securityService.detectSQLInjection(sqlInjection);
      expect(isDetected).toBe(true);
    });

    it('should detect XSS attacks', () => {
      const xssAttack = '<script>alert("XSS")</script>';
      const isDetected = securityService.detectXSS(xssAttack);
      expect(isDetected).toBe(true);
    });

    it('should validate input length', () => {
      const shortInput = 'Hello';
      const longInput = 'A'.repeat(1001);
      
      expect(securityService.validateInputLength(shortInput, 1000)).toBe(true);
      expect(securityService.validateInputLength(longInput, 1000)).toBe(false);
    });

    it('should validate email format', () => {
      expect(securityService.validateEmail('test@example.com')).toBe(true);
      expect(securityService.validateEmail('invalid-email')).toBe(false);
    });

    it('should validate phone number format', () => {
      expect(securityService.validatePhone('+1234567890')).toBe(true);
      expect(securityService.validatePhone('123-456-7890')).toBe(true);
      expect(securityService.validatePhone('invalid-phone')).toBe(false);
    });

    it('should generate secure random string', () => {
      const random1 = securityService.generateSecureRandom(16);
      const random2 = securityService.generateSecureRandom(16);
      
      expect(random1).toHaveLength(16);
      expect(random2).toHaveLength(16);
      expect(random1).not.toBe(random2);
    });

    it('should validate JWT token format', () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const invalidJWT = 'invalid-token';
      
      expect(securityService.validateJWTFormat(validJWT)).toBe(true);
      expect(securityService.validateJWTFormat(invalidJWT)).toBe(false);
    });
  });

  describe('ComprehensiveAuditService', () => {
    it('should log user action', async () => {
      const spy = jest.spyOn(auditService['logger'], 'log');
      
      await auditService.logUserAction(
        'CREATE',
        'user',
        'user123',
        'user1',
        'tenant1',
        { ip: '127.0.0.1', userAgent: 'test-agent' }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] User Action:')
      );
    });

    it('should log data change', async () => {
      const spy = jest.spyOn(auditService['logger'], 'log');
      
      await auditService.logDataChange(
        'UPDATE',
        'user',
        'user123',
        'user1',
        'tenant1',
        { name: 'John' },
        { name: 'Jane' }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] Data Change:')
      );
    });

    it('should log suspicious activity', async () => {
      const spy = jest.spyOn(auditService['logger'], 'warn');
      
      await auditService.logSuspiciousActivity(
        'user1',
        'tenant1',
        'Multiple failed login attempts',
        { ip: '127.0.0.1', attempts: 5 }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY AUDIT] Suspicious Activity:')
      );
    });

    it('should log authentication event', async () => {
      const spy = jest.spyOn(auditService['logger'], 'log');
      
      await auditService.logAuthenticationEvent(
        'LOGIN',
        'user1',
        'tenant1',
        { ip: '127.0.0.1', userAgent: 'test-agent' }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] Authentication:')
      );
    });

    it('should log permission change', async () => {
      const spy = jest.spyOn(auditService['logger'], 'log');
      
      await auditService.logPermissionChange(
        'user1',
        'tenant1',
        ['read'],
        ['read', 'write'],
        'admin1'
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] Permission Change:')
      );
    });

    it('should log system event', async () => {
      const spy = jest.spyOn(auditService['logger'], 'log');
      
      await auditService.logSystemEvent(
        'SYSTEM_STARTUP',
        { version: '1.0.0', environment: 'production' },
        'INFO'
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] System Event:')
      );
    });
  });

  describe('ComprehensiveMonitoringService', () => {
    it('should track system health', async () => {
      const spy = jest.spyOn(monitoringService['logger'], 'log');
      
      const health = await monitoringService.trackSystemHealth();
      
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('memory');
      expect(health).toHaveProperty('cpu');
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[MONITORING] System Health:')
      );
    });

    it('should track performance metrics', () => {
      const spy = jest.spyOn(monitoringService['logger'], 'log');
      
      monitoringService.trackPerformanceMetrics(
        '/test',
        'GET',
        100,
        1024,
        50
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[MONITORING] Performance:')
      );
    });

    it('should track error metrics', () => {
      const spy = jest.spyOn(monitoringService['logger'], 'error');
      
      monitoringService.trackErrorMetrics(
        '/test',
        'GET',
        new Error('Test error'),
        500
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[MONITORING] Error:')
      );
    });

    it('should track user activity', () => {
      const spy = jest.spyOn(monitoringService['logger'], 'log');
      
      monitoringService.trackUserActivity(
        'user1',
        'tenant1',
        'LOGIN',
        'authentication',
        { ip: '127.0.0.1' }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[MONITORING] User Activity:')
      );
    });

    it('should track API usage', () => {
      const spy = jest.spyOn(monitoringService['logger'], 'log');
      
      monitoringService.trackAPIUsage(
        '/test',
        'GET',
        'user1',
        'tenant1',
        100,
        200
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[MONITORING] API Usage:')
      );
    });

    it('should track database queries', () => {
      const spy = jest.spyOn(monitoringService['logger'], 'log');
      
      monitoringService.trackDatabaseQuery(
        'SELECT * FROM users',
        50,
        10,
        'user1',
        'tenant1'
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[MONITORING] Database Query:')
      );
    });

    it('should track external service calls', () => {
      const spy = jest.spyOn(monitoringService['logger'], 'log');
      
      monitoringService.trackExternalServiceCall(
        'payment-service',
        '/process-payment',
        'POST',
        200,
        200,
        'user1',
        'tenant1'
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[MONITORING] External Service Call:')
      );
    });

    it('should track cache operations', () => {
      const spy = jest.spyOn(monitoringService['logger'], 'log');
      
      monitoringService.trackCacheOperation(
        'GET',
        'user:123',
        true,
        10,
        'user1',
        'tenant1'
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[MONITORING] Cache Operation:')
      );
    });

    it('should get system metrics', () => {
      const metrics = monitoringService.getSystemMetrics();
      
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('platform');
      expect(metrics).toHaveProperty('nodeVersion');
      expect(metrics).toHaveProperty('pid');
    });

    it('should check system alerts', () => {
      const alerts = monitoringService.checkSystemAlerts();
      
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should generate monitoring report', () => {
      const report = monitoringService.generateMonitoringReport();
      
      expect(report).toHaveProperty('system');
      expect(report).toHaveProperty('performance');
      expect(report).toHaveProperty('alerts');
      expect(report).toHaveProperty('timestamp');
    });
  });

  describe('ComprehensiveAnalyticsService', () => {
    it('should track business metrics', () => {
      const spy = jest.spyOn(analyticsService['logger'], 'log');
      
      analyticsService.trackBusinessMetrics(
        'revenue',
        1000,
        'user1',
        'tenant1',
        { product: 'widget' }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[ANALYTICS] Business Metric:')
      );
    });

    it('should track technical metrics', () => {
      const spy = jest.spyOn(analyticsService['logger'], 'log');
      
      analyticsService.trackTechnicalMetrics(
        'response_time',
        100,
        '/api/test',
        'GET',
        { endpoint: '/api/test' }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[ANALYTICS] Technical Metric:')
      );
    });

    it('should track user behavior', () => {
      const spy = jest.spyOn(analyticsService['logger'], 'log');
      
      analyticsService.trackUserBehavior(
        'user1',
        'tenant1',
        'CLICK',
        'button',
        { page: '/home' }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[ANALYTICS] User Behavior:')
      );
    });

    it('should track conversion metrics', () => {
      const spy = jest.spyOn(analyticsService['logger'], 'log');
      
      analyticsService.trackConversion(
        'user1',
        'tenant1',
        'PURCHASE',
        100,
        { product: 'widget' }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[ANALYTICS] Conversion:')
      );
    });

    it('should track revenue metrics', () => {
      const spy = jest.spyOn(analyticsService['logger'], 'log');
      
      analyticsService.trackRevenue(
        'user1',
        'tenant1',
        100,
        'USD',
        { product: 'widget' }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[ANALYTICS] Revenue:')
      );
    });

    it('should track funnel analysis', () => {
      const spy = jest.spyOn(analyticsService['logger'], 'log');
      
      analyticsService.trackFunnelStep(
        'user1',
        'tenant1',
        'purchase_funnel',
        'view_product',
        1,
        { product: 'widget' }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[ANALYTICS] Funnel Step:')
      );
    });

    it('should track cohort analysis', () => {
      const spy = jest.spyOn(analyticsService['logger'], 'log');
      
      analyticsService.trackCohort(
        'user1',
        'tenant1',
        'january_2024',
        new Date('2024-01-01'),
        { source: 'organic' }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[ANALYTICS] Cohort:')
      );
    });

    it('should track retention metrics', () => {
      const spy = jest.spyOn(analyticsService['logger'], 'log');
      
      analyticsService.trackRetention(
        'user1',
        'tenant1',
        '30_days',
        true,
        { lastActivity: new Date() }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[ANALYTICS] Retention:')
      );
    });

    it('should track engagement metrics', () => {
      const spy = jest.spyOn(analyticsService['logger'], 'log');
      
      analyticsService.trackEngagement(
        'user1',
        'tenant1',
        'time_on_page',
        300,
        { page: '/home' }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[ANALYTICS] Engagement:')
      );
    });

    it('should track A/B testing', () => {
      const spy = jest.spyOn(analyticsService['logger'], 'log');
      
      analyticsService.trackABTest(
        'user1',
        'tenant1',
        'button_color_test',
        'red_button',
        { variant: 'red' }
      );
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('[ANALYTICS] A/B Test:')
      );
    });

    it('should get analytics summary', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const summary = analyticsService.getAnalyticsSummary(
        'tenant1',
        startDate,
        endDate
      );
      
      expect(summary).toHaveProperty('tenantId', 'tenant1');
      expect(summary).toHaveProperty('startDate', startDate);
      expect(summary).toHaveProperty('endDate', endDate);
      expect(summary).toHaveProperty('businessMetrics');
      expect(summary).toHaveProperty('technicalMetrics');
      expect(summary).toHaveProperty('userBehavior');
      expect(summary).toHaveProperty('conversions');
      expect(summary).toHaveProperty('revenue');
      expect(summary).toHaveProperty('funnels');
      expect(summary).toHaveProperty('cohorts');
      expect(summary).toHaveProperty('retention');
      expect(summary).toHaveProperty('engagement');
      expect(summary).toHaveProperty('abTests');
    });

    it('should generate analytics report', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const report = analyticsService.generateAnalyticsReport(
        'tenant1',
        startDate,
        endDate
      );
      
      expect(report).toHaveProperty('tenantId', 'tenant1');
      expect(report).toHaveProperty('startDate', startDate);
      expect(report).toHaveProperty('endDate', endDate);
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('reportType', 'COMPREHENSIVE_ANALYTICS');
    });
  });
});
