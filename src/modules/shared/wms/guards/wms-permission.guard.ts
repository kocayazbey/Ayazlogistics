import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * WMS Permission Guard
 * Checks if user has required permissions for WMS operations
 */
@Injectable()
export class WmsPermissionGuard implements CanActivate {
  private readonly logger = new Logger('WMS-Permission');

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler()
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userPermissions = user.permissions || [];
    const userRoles = user.roles || [];

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some((permission) => {
      // Check direct permission
      if (userPermissions.includes(permission)) {
        return true;
      }

      // Check role-based permissions
      if (this.checkRolePermission(userRoles, permission)) {
        return true;
      }

      return false;
    });

    if (!hasPermission) {
      this.logger.warn(
        `Permission denied for user ${user.id}: Required ${requiredPermissions.join(', ')}`
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
      );
    }

    this.logger.debug(`Permission granted for user ${user.id}`);
    return true;
  }

  private checkRolePermission(roles: string[], requiredPermission: string): boolean {
    const rolePermissions: Record<string, string[]> = {
      'wms_admin': [
        'wms.warehouse.create',
        'wms.warehouse.edit',
        'wms.warehouse.delete',
        'wms.location.create',
        'wms.location.edit',
        'wms.receiving.manage',
        'wms.picking.manage',
        'wms.shipping.manage',
        'wms.inventory.adjust',
        'wms.reports.view',
      ],
      'wms_manager': [
        'wms.warehouse.view',
        'wms.receiving.manage',
        'wms.picking.manage',
        'wms.shipping.manage',
        'wms.inventory.view',
        'wms.reports.view',
      ],
      'wms_supervisor': [
        'wms.receiving.view',
        'wms.picking.view',
        'wms.shipping.view',
        'wms.inventory.view',
      ],
      'wms_operator': [
        'wms.receiving.execute',
        'wms.picking.execute',
        'wms.putaway.execute',
        'wms.cycle_count.execute',
      ],
    };

    for (const role of roles) {
      const permissions = rolePermissions[role] || [];
      if (permissions.includes(requiredPermission)) {
        return true;
      }
    }

    return false;
  }
}

