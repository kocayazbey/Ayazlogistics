import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { hasPermission, hasAnyPermission, Permission, Role } from '../rbac/permissions';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  permissions: Permission[];
  tenantId: string;
  warehouseId: string;
  jti: string;
}

@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions or roles are required, allow access
    if ((!requiredPermissions || requiredPermissions.length === 0) &&
        (!requiredRoles || requiredRoles.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) {
      this.logger.warn('No user found in request for RBAC check');
      throw new ForbiddenException('Authentication required');
    }

    // Check role-based access first
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.includes(user.role);

      if (!hasRequiredRole) {
        this.logger.warn(`Role access denied for user ${user.id} (${user.role}). Required roles: ${requiredRoles.join(', ')}`);
        throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
      }
    }

    // Check permission-based access
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasRequiredPermissions = hasAnyPermission(user.permissions, requiredPermissions);

      if (!hasRequiredPermissions) {
        this.logger.warn(`Permission access denied for user ${user.id}. Required permissions: ${requiredPermissions.join(', ')}`);
        throw new ForbiddenException(`Access denied. Required permissions: ${requiredPermissions.join(', ')}`);
      }
    }

    this.logger.debug(`RBAC access granted for user ${user.id} (${user.role}) to ${context.getHandler().name}`);
    return true;
  }
}
