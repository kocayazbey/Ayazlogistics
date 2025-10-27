import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * Mandatory Tenant Isolation Guard
 * This guard MUST be applied to all controllers and routes to ensure tenant isolation
 * It enforces strict tenant context validation and prevents cross-tenant data access
 */
@Injectable()
export class TenantIsolationMandatoryGuard implements CanActivate {
  private readonly logger = new Logger('TenantIsolationMandatory');

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Log the request for audit purposes
    this.logger.debug(`Tenant isolation check for ${request.method} ${request.url}`);

    // 1. User Authentication Check
    if (!user) {
      this.logger.warn(`Unauthenticated request to ${request.url}`);
      throw new ForbiddenException('User not authenticated - tenant isolation requires authentication');
    }

    // 2. Tenant ID Validation
    if (!user.tenantId) {
      this.logger.error(`User ${user.id} has no tenant ID - security violation`);
      throw new BadRequestException('Tenant ID is required for all operations - tenant isolation mandatory');
    }

    // 3. Tenant ID Format Validation
    if (typeof user.tenantId !== 'string' || user.tenantId.trim().length === 0) {
      this.logger.error(`Invalid tenant ID format for user ${user.id}: ${user.tenantId}`);
      throw new BadRequestException('Invalid tenant ID format');
    }

    // 4. Organization ID Validation (if present)
    if (user.organizationId && typeof user.organizationId !== 'string') {
      this.logger.error(`Invalid organization ID format for user ${user.id}: ${user.organizationId}`);
      throw new BadRequestException('Invalid organization ID format');
    }

    // 5. Set mandatory tenant context headers
    request.headers['x-tenant-id'] = user.tenantId;
    request.headers['x-user-id'] = user.id;
    request.headers['x-organization-id'] = user.organizationId || '';
    request.headers['x-tenant-isolation-verified'] = 'true';

    // 6. Validate request parameters against tenant context
    this.validateRequestTenantContext(request, user);

    // 7. Set tenant context in request for downstream services
    (request as any).tenantContext = {
      tenantId: user.tenantId,
      organizationId: user.organizationId,
      userId: user.id,
      roles: user.roles || [],
      permissions: user.permissions || [],
      isolationLevel: 'mandatory',
      verifiedAt: new Date().toISOString(),
    };

    this.logger.debug(`Tenant isolation verified for tenant: ${user.tenantId}, user: ${user.id}`);
    return true;
  }

  /**
   * Validates that request parameters don't contain tenant IDs that don't match user's tenant
   */
  private validateRequestTenantContext(request: Request, user: any): void {
    const tenantId = user.tenantId;
    
    // Check URL parameters
    const urlTenantId = request.params.tenantId;
    if (urlTenantId && urlTenantId !== tenantId) {
      this.logger.error(`Tenant mismatch in URL: user tenant ${tenantId} vs URL tenant ${urlTenantId}`);
      throw new ForbiddenException('Access denied: Tenant ID in URL does not match user tenant');
    }

    // Check query parameters
    const queryTenantId = request.query.tenantId as string;
    if (queryTenantId && queryTenantId !== tenantId) {
      this.logger.error(`Tenant mismatch in query: user tenant ${tenantId} vs query tenant ${queryTenantId}`);
      throw new ForbiddenException('Access denied: Tenant ID in query does not match user tenant');
    }

    // Check request body
    if (request.body && typeof request.body === 'object') {
      const bodyTenantId = request.body.tenantId;
      if (bodyTenantId && bodyTenantId !== tenantId) {
        this.logger.error(`Tenant mismatch in body: user tenant ${tenantId} vs body tenant ${bodyTenantId}`);
        throw new ForbiddenException('Access denied: Tenant ID in request body does not match user tenant');
      }

      // Remove tenant ID from body to prevent injection
      delete request.body.tenantId;
    }
  }
}

/**
 * Decorator to mark controllers/routes that require mandatory tenant isolation
 * This should be applied to ALL controllers in the system
 */
export const TenantIsolationRequired = () => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    // This decorator serves as documentation and can be used for static analysis
    // The actual enforcement is done by the TenantIsolationMandatoryGuard
    if (propertyKey) {
      // Method level decorator
      Reflect.defineMetadata('tenant-isolation-required', true, target, propertyKey);
    } else {
      // Class level decorator
      Reflect.defineMetadata('tenant-isolation-required', true, target);
    }
  };
};

/**
 * Decorator to mark controllers/routes that are exempt from tenant isolation
 * This should be used VERY sparingly and only for system-level operations
 */
export const TenantIsolationExempt = () => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (propertyKey) {
      Reflect.defineMetadata('tenant-isolation-exempt', true, target, propertyKey);
    } else {
      Reflect.defineMetadata('tenant-isolation-exempt', true, target);
    }
  };
};
