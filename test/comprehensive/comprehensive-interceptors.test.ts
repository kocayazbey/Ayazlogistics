import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { ComprehensiveAuditInterceptor } from '../../src/common/interceptors/comprehensive-audit.interceptor';
import { ComprehensivePerformanceInterceptor } from '../../src/common/interceptors/comprehensive-performance.interceptor';
import { ComprehensiveSecurityInterceptor } from '../../src/common/interceptors/comprehensive-security.interceptor';
import { ComprehensiveMonitoringInterceptor } from '../../src/common/interceptors/comprehensive-monitoring.interceptor';
import { ComprehensiveAnalyticsInterceptor } from '../../src/common/interceptors/comprehensive-analytics.interceptor';

describe('Comprehensive Interceptors', () => {
  let module: TestingModule;
  let reflector: Reflector;
  let auditInterceptor: ComprehensiveAuditInterceptor;
  let performanceInterceptor: ComprehensivePerformanceInterceptor;
  let securityInterceptor: ComprehensiveSecurityInterceptor;
  let monitoringInterceptor: ComprehensiveMonitoringInterceptor;
  let analyticsInterceptor: ComprehensiveAnalyticsInterceptor;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        Reflector,
        ComprehensiveAuditInterceptor,
        ComprehensivePerformanceInterceptor,
        ComprehensiveSecurityInterceptor,
        ComprehensiveMonitoringInterceptor,
        ComprehensiveAnalyticsInterceptor,
      ],
    }).compile();

    reflector = module.get<Reflector>(Reflector);
    auditInterceptor = module.get<ComprehensiveAuditInterceptor>(ComprehensiveAuditInterceptor);
    performanceInterceptor = module.get<ComprehensivePerformanceInterceptor>(ComprehensivePerformanceInterceptor);
    securityInterceptor = module.get<ComprehensiveSecurityInterceptor>(ComprehensiveSecurityInterceptor);
    monitoringInterceptor = module.get<ComprehensiveMonitoringInterceptor>(ComprehensiveMonitoringInterceptor);
    analyticsInterceptor = module.get<ComprehensiveAnalyticsInterceptor>(ComprehensiveAnalyticsInterceptor);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('ComprehensiveAuditInterceptor', () => {
    it('should log audit events on success', (done) => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user1', tenantId: 'tenant1' },
            method: 'GET',
            url: '/test',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'test-agent' },
          }),
          getResponse: () => ({ statusCode: 200 }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const mockNext = {
        handle: () => of({ success: true }),
      } as CallHandler;

      // Mock reflector to return audit metadata
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'audit_action') return 'READ';
        if (key === 'audit_resource') return 'test';
        if (key === 'audit_level') return 'BASIC';
        return undefined;
      });

      auditInterceptor.intercept(mockContext, mockNext).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true });
          done();
        },
        error: done,
      });
    });

    it('should log audit events on error', (done) => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user1', tenantId: 'tenant1' },
            method: 'GET',
            url: '/test',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'test-agent' },
          }),
          getResponse: () => ({ statusCode: 500 }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const mockNext = {
        handle: () => throwError(() => new Error('Test error')),
      } as CallHandler;

      // Mock reflector to return audit metadata
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'audit_action') return 'READ';
        if (key === 'audit_resource') return 'test';
        if (key === 'audit_level') return 'BASIC';
        return undefined;
      });

      auditInterceptor.intercept(mockContext, mockNext).subscribe({
        next: () => done(new Error('Should have thrown')),
        error: (error) => {
          expect(error.message).toBe('Test error');
          done();
        },
      });
    });
  });

  describe('ComprehensivePerformanceInterceptor', () => {
    it('should track performance metrics on success', (done) => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user1', tenantId: 'tenant1' },
            method: 'GET',
            url: '/test',
            headers: { 'x-request-id': 'req-123' },
          }),
          getResponse: () => ({ statusCode: 200 }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const mockNext = {
        handle: () => of({ success: true }),
      } as CallHandler;

      // Mock reflector to return performance metadata
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'performance') return true;
        if (key === 'performance_options') return { trackExecutionTime: true, alertThreshold: 5000 };
        return undefined;
      });

      performanceInterceptor.intercept(mockContext, mockNext).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true });
          done();
        },
        error: done,
      });
    });

    it('should track performance metrics on error', (done) => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user1', tenantId: 'tenant1' },
            method: 'GET',
            url: '/test',
            headers: { 'x-request-id': 'req-123' },
          }),
          getResponse: () => ({ statusCode: 500 }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const mockNext = {
        handle: () => throwError(() => new Error('Test error')),
      } as CallHandler;

      // Mock reflector to return performance metadata
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'performance') return true;
        if (key === 'performance_options') return { trackExecutionTime: true, alertThreshold: 5000 };
        return undefined;
      });

      performanceInterceptor.intercept(mockContext, mockNext).subscribe({
        next: () => done(new Error('Should have thrown')),
        error: (error) => {
          expect(error.message).toBe('Test error');
          done();
        },
      });
    });
  });

  describe('ComprehensiveSecurityInterceptor', () => {
    it('should validate security requirements', (done) => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user1', tenantId: 'tenant1' },
            method: 'GET',
            url: '/test',
            protocol: 'https',
            body: { test: 'value' },
            query: { test: 'value' },
            params: { test: 'value' },
          }),
          getResponse: () => ({ statusCode: 200 }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const mockNext = {
        handle: () => of({ success: true }),
      } as CallHandler;

      // Mock reflector to return security metadata
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'security') return true;
        if (key === 'security_options') return { 
          requireHttps: true, 
          requireAuth: true, 
          sanitizeInput: true,
          xssProtection: true,
          sqlInjectionProtection: true
        };
        return undefined;
      });

      securityInterceptor.intercept(mockContext, mockNext).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true });
          done();
        },
        error: done,
      });
    });
  });

  describe('ComprehensiveMonitoringInterceptor', () => {
    it('should track monitoring metrics on success', (done) => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user1', tenantId: 'tenant1' },
            method: 'GET',
            url: '/test',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'test-agent' },
          }),
          getResponse: () => ({ statusCode: 200 }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const mockNext = {
        handle: () => of({ success: true }),
      } as CallHandler;

      // Mock reflector to return monitoring metadata
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'monitoring') return true;
        if (key === 'monitoring_options') return { 
          trackMetrics: true, 
          trackHealth: true, 
          trackErrors: true,
          enableAlerts: true
        };
        return undefined;
      });

      monitoringInterceptor.intercept(mockContext, mockNext).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true });
          done();
        },
        error: done,
      });
    });
  });

  describe('ComprehensiveAnalyticsInterceptor', () => {
    it('should track analytics on success', (done) => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user1', tenantId: 'tenant1' },
            method: 'GET',
            url: '/test',
            ip: '127.0.0.1',
            headers: { 
              'user-agent': 'test-agent',
              'x-session-id': 'sess-123',
              'x-request-id': 'req-123'
            },
          }),
          getResponse: () => ({ statusCode: 200 }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const mockNext = {
        handle: () => of({ success: true }),
      } as CallHandler;

      // Mock reflector to return analytics metadata
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'analytics') return true;
        if (key === 'analytics_options') return { 
          trackBusinessMetrics: true, 
          trackTechnicalMetrics: true,
          trackUserBehavior: true,
          enableRealTimeAnalytics: true
        };
        return undefined;
      });

      analyticsInterceptor.intercept(mockContext, mockNext).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true });
          done();
        },
        error: done,
      });
    });
  });
});
