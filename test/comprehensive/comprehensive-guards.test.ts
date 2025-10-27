import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ComprehensivePermissionGuard } from '../../src/common/guards/comprehensive-permission.guard';
import { ComprehensiveTenantIsolationGuard } from '../../src/common/guards/comprehensive-tenant-isolation.guard';
import { ComprehensiveRateLimitGuard } from '../../src/common/guards/comprehensive-rate-limit.guard';

describe('Comprehensive Guards', () => {
  let module: TestingModule;
  let reflector: Reflector;
  let permissionGuard: ComprehensivePermissionGuard;
  let tenantGuard: ComprehensiveTenantIsolationGuard;
  let rateLimitGuard: ComprehensiveRateLimitGuard;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        Reflector,
        ComprehensivePermissionGuard,
        ComprehensiveTenantIsolationGuard,
        ComprehensiveRateLimitGuard,
      ],
    }).compile();

    reflector = module.get<Reflector>(Reflector);
    permissionGuard = module.get<ComprehensivePermissionGuard>(ComprehensivePermissionGuard);
    tenantGuard = module.get<ComprehensiveTenantIsolationGuard>(ComprehensiveTenantIsolationGuard);
    rateLimitGuard = module.get<ComprehensiveRateLimitGuard>(ComprehensiveRateLimitGuard);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('ComprehensivePermissionGuard', () => {
    it('should allow access when user has required roles', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { 
              id: 'user1', 
              roles: ['admin', 'manager'],
              permissions: ['read', 'write']
            },
            method: 'GET',
            url: '/test',
          }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      // Mock reflector to return required roles
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'roles') return ['admin'];
        if (key === 'permissions') return ['read'];
        return undefined;
      });

      const result = permissionGuard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should deny access when user lacks required roles', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { 
              id: 'user1', 
              roles: ['user'],
              permissions: ['read']
            },
            method: 'GET',
            url: '/test',
          }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      // Mock reflector to return required roles
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'roles') return ['admin'];
        if (key === 'permissions') return ['read'];
        return undefined;
      });

      expect(() => permissionGuard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should deny access when user lacks required permissions', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { 
              id: 'user1', 
              roles: ['admin'],
              permissions: ['read']
            },
            method: 'GET',
            url: '/test',
          }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      // Mock reflector to return required permissions
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'roles') return ['admin'];
        if (key === 'permissions') return ['read', 'write'];
        return undefined;
      });

      expect(() => permissionGuard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException when user is not authenticated', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: null,
            method: 'GET',
            url: '/test',
          }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      expect(() => permissionGuard.canActivate(mockContext)).toThrow(UnauthorizedException);
    });
  });

  describe('ComprehensiveTenantIsolationGuard', () => {
    it('should allow access when tenant isolation is not required', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user1', tenantId: 'tenant1' },
            method: 'GET',
            url: '/test',
          }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      // Mock reflector to return no tenant options
      jest.spyOn(reflector, 'get').mockImplementation(() => undefined);

      const result = tenantGuard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should allow access when user belongs to the tenant', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { 
              id: 'user1', 
              tenantId: 'tenant1',
              tenantAccess: ['tenant1']
            },
            method: 'GET',
            url: '/test',
          }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      // Mock reflector to return tenant options
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'tenant_options') return { 
          requireTenantId: true, 
          validateTenantAccess: true,
          enableTenantFiltering: true
        };
        return undefined;
      });

      const result = tenantGuard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should deny access when user does not belong to the tenant', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { 
              id: 'user1', 
              tenantId: 'tenant2',
              tenantAccess: ['tenant2']
            },
            method: 'GET',
            url: '/test',
          }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      // Mock reflector to return tenant options
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'tenant_options') return { 
          requireTenantId: true, 
          validateTenantAccess: true,
          enableTenantFiltering: true
        };
        return undefined;
      });

      expect(() => tenantGuard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when tenant ID is required but not provided', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user1', tenantId: null },
            method: 'GET',
            url: '/test',
          }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      // Mock reflector to return tenant options
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'tenant_options') return { 
          requireTenantId: true, 
          validateTenantAccess: true,
          enableTenantFiltering: true
        };
        return undefined;
      });

      expect(() => tenantGuard.canActivate(mockContext)).toThrow(BadRequestException);
    });
  });

  describe('ComprehensiveRateLimitGuard', () => {
    it('should allow access when rate limiting is not enabled', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user1', tenantId: 'tenant1' },
            method: 'GET',
            url: '/test',
            ip: '127.0.0.1',
          }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      // Mock reflector to return no rate limit
      jest.spyOn(reflector, 'get').mockImplementation(() => undefined);

      const result = rateLimitGuard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should allow access when within rate limit', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user1', tenantId: 'tenant1' },
            method: 'GET',
            url: '/test',
            ip: '127.0.0.1',
          }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      // Mock reflector to return rate limit options
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'rate_limit') return true;
        if (key === 'rate_limit_options') return { 
          requests: 100, 
          windowMs: 60000,
          message: 'Too many requests'
        };
        return undefined;
      });

      const result = rateLimitGuard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should allow access when rate limit window has expired', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user1', tenantId: 'tenant1' },
            method: 'GET',
            url: '/test',
            ip: '127.0.0.1',
          }),
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      // Mock reflector to return rate limit options
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'rate_limit') return true;
        if (key === 'rate_limit_options') return { 
          requests: 1, 
          windowMs: 1000, // 1 second
          message: 'Too many requests'
        };
        return undefined;
      });

      // First request should pass
      const result1 = rateLimitGuard.canActivate(mockContext);
      expect(result1).toBe(true);

      // Wait for window to expire
      setTimeout(() => {
        const result2 = rateLimitGuard.canActivate(mockContext);
        expect(result2).toBe(true);
      }, 1100);
    });
  });
});
