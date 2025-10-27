import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TENANT_KEY, TENANT_OPTIONS_KEY } from '../decorators/tenant.decorator';
import { Logger } from '@nestjs/common';

@Injectable()
export class ComprehensiveTenantIsolationGuard implements CanActivate {
  private readonly logger = new Logger(ComprehensiveTenantIsolationGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const tenantOptions = this.reflector.get<any>(TENANT_OPTIONS_KEY, context.getHandler());
    
    if (!tenantOptions) {
      return true; // No tenant isolation required
    }

    const tenantId = user.tenantId;
    
    // Check if tenant ID is required
    if (tenantOptions.requireTenantId && !tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    // Validate tenant access
    if (tenantOptions.validateTenantAccess) {
      this.validateTenantAccess(user, tenantId);
    }

    // Enforce data isolation
    if (tenantOptions.enableTenantFiltering) {
      this.enforceDataIsolation(request, tenantId);
    }

    // Log tenant isolation check
    this.logger.log(`Tenant isolation check passed for tenant ${tenantId} on ${request.method} ${request.url}`);

    return true;
  }

  private validateTenantAccess(user: any, tenantId: string) {
    // Check if user belongs to the tenant
    if (user.tenantId !== tenantId) {
      this.logger.warn(`User ${user.id} attempted to access tenant ${tenantId} but belongs to ${user.tenantId}`);
      throw new ForbiddenException('Access denied: Invalid tenant');
    }

    // Check if user has access to the tenant
    if (!user.tenantAccess || !user.tenantAccess.includes(tenantId)) {
      this.logger.warn(`User ${user.id} lacks access to tenant ${tenantId}`);
      throw new ForbiddenException('Access denied: No tenant access');
    }
  }

  private enforceDataIsolation(request: any, tenantId: string) {
    // Add tenant filter to request
    request.tenantFilter = { tenantId };
    
    // Add tenant context to request
    request.tenantContext = {
      tenantId,
      isolationLevel: 'strict',
      dataFilter: true,
    };

    // Log data isolation enforcement
    this.logger.log(`Data isolation enforced for tenant ${tenantId}`);
  }
}
