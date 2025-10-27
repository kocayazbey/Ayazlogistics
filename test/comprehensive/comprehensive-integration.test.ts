import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { ComprehensiveAuditInterceptor } from '../../src/common/interceptors/comprehensive-audit.interceptor';
import { ComprehensivePerformanceInterceptor } from '../../src/common/interceptors/comprehensive-performance.interceptor';
import { ComprehensiveSecurityInterceptor } from '../../src/common/interceptors/comprehensive-security.interceptor';
import { ComprehensiveMonitoringInterceptor } from '../../src/common/interceptors/comprehensive-monitoring.interceptor';
import { ComprehensiveAnalyticsInterceptor } from '../../src/common/interceptors/comprehensive-analytics.interceptor';
import { ComprehensivePermissionGuard } from '../../src/common/guards/comprehensive-permission.guard';
import { ComprehensiveTenantIsolationGuard } from '../../src/common/guards/comprehensive-tenant-isolation.guard';
import { ComprehensiveRateLimitGuard } from '../../src/common/guards/comprehensive-rate-limit.guard';
import { ComprehensiveSecurityService } from '../../src/common/services/comprehensive-security.service';
import { ComprehensiveAuditService } from '../../src/common/services/comprehensive-audit.service';
import { ComprehensiveMonitoringService } from '../../src/common/services/comprehensive-monitoring.service';
import { ComprehensiveAnalyticsService } from '../../src/common/services/comprehensive-analytics.service';

describe('Comprehensive Integration Tests', () => {
  let module: TestingModule;
  let reflector: Reflector;
  let auditInterceptor: ComprehensiveAuditInterceptor;
  let performanceInterceptor: ComprehensivePerformanceInterceptor;
  let securityInterceptor: ComprehensiveSecurityInterceptor;
  let monitoringInterceptor: ComprehensiveMonitoringInterceptor;
  let analyticsInterceptor: ComprehensiveAnalyticsInterceptor;
  let permissionGuard: ComprehensivePermissionGuard;
  let tenantGuard: ComprehensiveTenantIsolationGuard;
  let rateLimitGuard: ComprehensiveRateLimitGuard;
  let securityService: ComprehensiveSecurityService;
  let auditService: ComprehensiveAuditService;
  let monitoringService: ComprehensiveMonitoringService;
  let analyticsService: ComprehensiveAnalyticsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        Reflector,
        ComprehensiveAuditInterceptor,
        ComprehensivePerformanceInterceptor,
        ComprehensiveSecurityInterceptor,
        ComprehensiveMonitoringInterceptor,
        ComprehensiveAnalyticsInterceptor,
        ComprehensivePermissionGuard,
        ComprehensiveTenantIsolationGuard,
        ComprehensiveRateLimitGuard,
        ComprehensiveSecurityService,
        ComprehensiveAuditService,
        ComprehensiveMonitoringService,
        ComprehensiveAnalyticsService,
      ],
    }).compile();

    reflector = module.get<Reflector>(Reflector);
    auditInterceptor = module.get<ComprehensiveAuditInterceptor>(ComprehensiveAuditInterceptor);
    performanceInterceptor = module.get<ComprehensivePerformanceInterceptor>(ComprehensivePerformanceInterceptor);
    securityInterceptor = module.get<ComprehensiveSecurityInterceptor>(ComprehensiveSecurityInterceptor);
    monitoringInterceptor = module.get<ComprehensiveMonitoringInterceptor>(ComprehensiveMonitoringInterceptor);
    analyticsInterceptor = module.get<ComprehensiveAnalyticsInterceptor>(ComprehensiveAnalyticsInterceptor);
    permissionGuard = module.get<ComprehensivePermissionGuard>(ComprehensivePermissionGuard);
    tenantGuard = module.get<ComprehensiveTenantIsolationGuard>(ComprehensiveTenantIsolationGuard);
    rateLimitGuard = module.get<ComprehensiveRateLimitGuard>(ComprehensiveRateLimitGuard);
    securityService = module.get<ComprehensiveSecurityService>(ComprehensiveSecurityService);
    auditService = module.get<ComprehensiveAuditService>(ComprehensiveAuditService);
    monitoringService = module.get<ComprehensiveMonitoringService>(ComprehensiveMonitoringService);
    analyticsService = module.get<ComprehensiveAnalyticsService>(ComprehensiveAnalyticsService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('End-to-End Request Flow', () => {
    it('should handle a complete request with all decorators and interceptors', (done) => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { 
              id: 'user1', 
              tenantId: 'tenant1',
              roles: ['admin'],
              permissions: ['read', 'write']
            },
            method: 'GET',
            url: '/api/test',
            ip: '127.0.0.1',
            protocol: 'https',
            headers: { 
              'user-agent': 'test-agent',
              'x-session-id': 'sess-123',
              'x-request-id': 'req-123'
            },
            body: { test: 'value' },
            query: { test: 'value' },
            params: { test: 'value' },
          }),
          getResponse: () => ({ statusCode: 200 }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const mockNext = {
        handle: () => of({ success: true, data: 'test data' }),
      } as CallHandler;

      // Mock all reflector calls
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        const metadata = {
          'audit_action': 'READ',
          'audit_resource': 'test',
          'audit_level': 'BASIC',
          'rate_limit': true,
          'rate_limit_options': { requests: 100, windowMs: 60000, message: 'Too many requests' },
          'performance': true,
          'performance_options': { trackExecutionTime: true, alertThreshold: 5000 },
          'security': true,
          'security_options': { 
            level: 'strict', 
            requireHttps: true, 
            requireAuth: true,
            sanitizeInput: true,
            xssProtection: true,
            sqlInjectionProtection: true
          },
          'monitoring': true,
          'monitoring_options': { 
            trackMetrics: true, 
            trackHealth: true, 
            trackErrors: true,
            enableAlerts: true
          },
          'analytics': true,
          'analytics_options': { 
            trackBusinessMetrics: true, 
            trackTechnicalMetrics: true,
            trackUserBehavior: true,
            enableRealTimeAnalytics: true
          },
          'roles': ['admin'],
          'permissions': ['read'],
          'tenant_options': { 
            requireTenantId: true, 
            validateTenantAccess: true,
            enableTenantFiltering: true
          }
        };
        return metadata[key];
      });

      // Test guards
      expect(permissionGuard.canActivate(mockContext)).toBe(true);
      expect(tenantGuard.canActivate(mockContext)).toBe(true);
      expect(rateLimitGuard.canActivate(mockContext)).toBe(true);

      // Test interceptors
      auditInterceptor.intercept(mockContext, mockNext).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true, data: 'test data' });
          done();
        },
        error: done,
      });
    });

    it('should handle a request with security validation', (done) => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { 
              id: 'user1', 
              tenantId: 'tenant1',
              roles: ['admin'],
              permissions: ['read', 'write']
            },
            method: 'POST',
            url: '/api/test',
            ip: '127.0.0.1',
            protocol: 'https',
            headers: { 
              'user-agent': 'test-agent',
              'x-session-id': 'sess-123',
              'x-request-id': 'req-123'
            },
            body: { 
              name: '<script>alert("XSS")</script>John',
              email: 'test@example.com',
              query: "'; DROP TABLE users; --"
            },
            query: { test: 'value' },
            params: { test: 'value' },
          }),
          getResponse: () => ({ statusCode: 200 }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const mockNext = {
        handle: () => of({ success: true, data: 'test data' }),
      } as CallHandler;

      // Mock reflector calls
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        const metadata = {
          'security': true,
          'security_options': { 
            level: 'strict', 
            requireHttps: true, 
            requireAuth: true,
            sanitizeInput: true,
            xssProtection: true,
            sqlInjectionProtection: true
          }
        };
        return metadata[key];
      });

      // Test security service
      expect(securityService.detectXSS('<script>alert("XSS")</script>')).toBe(true);
      expect(securityService.detectSQLInjection("'; DROP TABLE users; --")).toBe(true);
      expect(securityService.validateEmail('test@example.com')).toBe(true);

      // Test security interceptor
      securityInterceptor.intercept(mockContext, mockNext).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true, data: 'test data' });
          done();
        },
        error: done,
      });
    });

    it('should handle a request with comprehensive monitoring', (done) => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { 
              id: 'user1', 
              tenantId: 'tenant1',
              roles: ['admin'],
              permissions: ['read', 'write']
            },
            method: 'GET',
            url: '/api/test',
            ip: '127.0.0.1',
            headers: { 
              'user-agent': 'test-agent',
              'x-session-id': 'sess-123',
              'x-request-id': 'req-123'
            },
            body: { test: 'value' },
            query: { test: 'value' },
            params: { test: 'value' },
          }),
          getResponse: () => ({ statusCode: 200 }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const mockNext = {
        handle: () => of({ success: true, data: 'test data' }),
      } as CallHandler;

      // Mock reflector calls
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        const metadata = {
          'monitoring': true,
          'monitoring_options': { 
            trackMetrics: true, 
            trackHealth: true, 
            trackErrors: true,
            enableAlerts: true,
            alertThresholds: {
              latency: 1000,
              memoryUsage: 100 * 1024 * 1024,
              cpuUsage: 1000000
            }
          }
        };
        return metadata[key];
      });

      // Test monitoring service
      const health = monitoringService.trackSystemHealth();
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('memory');
      expect(health).toHaveProperty('cpu');

      monitoringService.trackPerformanceMetrics('/api/test', 'GET', 100, 1024, 50);
      monitoringService.trackUserActivity('user1', 'tenant1', 'LOGIN', 'authentication', { ip: '127.0.0.1' });
      monitoringService.trackAPIUsage('/api/test', 'GET', 'user1', 'tenant1', 100, 200);

      const report = monitoringService.generateMonitoringReport();
      expect(report).toHaveProperty('system');
      expect(report).toHaveProperty('performance');
      expect(report).toHaveProperty('alerts');

      // Test monitoring interceptor
      monitoringInterceptor.intercept(mockContext, mockNext).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true, data: 'test data' });
          done();
        },
        error: done,
      });
    });

    it('should handle a request with comprehensive analytics', (done) => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { 
              id: 'user1', 
              tenantId: 'tenant1',
              roles: ['admin'],
              permissions: ['read', 'write']
            },
            method: 'GET',
            url: '/api/test',
            ip: '127.0.0.1',
            headers: { 
              'user-agent': 'test-agent',
              'x-session-id': 'sess-123',
              'x-request-id': 'req-123'
            },
            body: { test: 'value' },
            query: { test: 'value' },
            params: { test: 'value' },
          }),
          getResponse: () => ({ statusCode: 200 }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const mockNext = {
        handle: () => of({ success: true, data: 'test data' }),
      } as CallHandler;

      // Mock reflector calls
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        const metadata = {
          'analytics': true,
          'analytics_options': { 
            trackBusinessMetrics: true, 
            trackTechnicalMetrics: true,
            trackUserBehavior: true,
            enableRealTimeAnalytics: true
          }
        };
        return metadata[key];
      });

      // Test analytics service
      analyticsService.trackBusinessMetrics('revenue', 1000, 'user1', 'tenant1', { product: 'widget' });
      analyticsService.trackTechnicalMetrics('response_time', 100, '/api/test', 'GET', { endpoint: '/api/test' });
      analyticsService.trackUserBehavior('user1', 'tenant1', 'CLICK', 'button', { page: '/home' });
      analyticsService.trackConversion('user1', 'tenant1', 'PURCHASE', 100, { product: 'widget' });
      analyticsService.trackRevenue('user1', 'tenant1', 100, 'USD', { product: 'widget' });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const summary = analyticsService.getAnalyticsSummary('tenant1', startDate, endDate);
      expect(summary).toHaveProperty('tenantId', 'tenant1');
      expect(summary).toHaveProperty('startDate', startDate);
      expect(summary).toHaveProperty('endDate', endDate);

      const report = analyticsService.generateAnalyticsReport('tenant1', startDate, endDate);
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('reportType', 'COMPREHENSIVE_ANALYTICS');

      // Test analytics interceptor
      analyticsInterceptor.intercept(mockContext, mockNext).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true, data: 'test data' });
          done();
        },
        error: done,
      });
    });

    it('should handle a request with comprehensive audit', (done) => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { 
              id: 'user1', 
              tenantId: 'tenant1',
              roles: ['admin'],
              permissions: ['read', 'write']
            },
            method: 'POST',
            url: '/api/test',
            ip: '127.0.0.1',
            headers: { 
              'user-agent': 'test-agent',
              'x-session-id': 'sess-123',
              'x-request-id': 'req-123'
            },
            body: { test: 'value' },
            query: { test: 'value' },
            params: { test: 'value' },
          }),
          getResponse: () => ({ statusCode: 201 }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const mockNext = {
        handle: () => of({ success: true, data: 'test data' }),
      } as CallHandler;

      // Mock reflector calls
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        const metadata = {
          'audit_action': 'CREATE',
          'audit_resource': 'test',
          'audit_level': 'DETAILED'
        };
        return metadata[key];
      });

      // Test audit service
      auditService.logUserAction('CREATE', 'test', 'test123', 'user1', 'tenant1', { ip: '127.0.0.1' });
      auditService.logDataChange('CREATE', 'test', 'test123', 'user1', 'tenant1', null, { name: 'test' });
      auditService.logSuspiciousActivity('user1', 'tenant1', 'Multiple failed login attempts', { ip: '127.0.0.1', attempts: 5 });

      // Test audit interceptor
      auditInterceptor.intercept(mockContext, mockNext).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true, data: 'test data' });
          done();
        },
        error: done,
      });
    });
  });
});
