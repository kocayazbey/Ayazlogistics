import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Logger } from '@nestjs/common';

@Injectable()
export class ComprehensivePermissionGuard implements CanActivate {
  private readonly logger = new Logger(ComprehensivePermissionGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    const requiredPermissions = this.reflector.get<string[]>(PERMISSIONS_KEY, context.getHandler());

    // Check roles
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some(role => user.roles?.includes(role));
      if (!hasRequiredRole) {
        this.logger.warn(`User ${user.id} lacks required roles: ${requiredRoles.join(', ')}`);
        throw new ForbiddenException('Insufficient role permissions');
      }
    }

    // Check permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasRequiredPermission = requiredPermissions.every(permission => 
        user.permissions?.includes(permission)
      );
      if (!hasRequiredPermission) {
        this.logger.warn(`User ${user.id} lacks required permissions: ${requiredPermissions.join(', ')}`);
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // Log permission check
    this.logger.log(`Permission check passed for user ${user.id} on ${request.method} ${request.url}`);

    return true;
  }
}
