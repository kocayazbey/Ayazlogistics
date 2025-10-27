import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

export enum Permission {
  // Users
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // Warehouses
  WAREHOUSE_CREATE = 'warehouse:create',
  WAREHOUSE_READ = 'warehouse:read',
  WAREHOUSE_UPDATE = 'warehouse:update',
  WAREHOUSE_DELETE = 'warehouse:delete',

  // Inventory
  INVENTORY_CREATE = 'inventory:create',
  INVENTORY_READ = 'inventory:read',
  INVENTORY_UPDATE = 'inventory:update',
  INVENTORY_DELETE = 'inventory:delete',
  INVENTORY_ADJUST = 'inventory:adjust',
  INVENTORY_TRANSFER = 'inventory:transfer',

  // Vehicles
  VEHICLE_CREATE = 'vehicle:create',
  VEHICLE_READ = 'vehicle:read',
  VEHICLE_UPDATE = 'vehicle:update',
  VEHICLE_DELETE = 'vehicle:delete',

  // Drivers
  DRIVER_CREATE = 'driver:create',
  DRIVER_READ = 'driver:read',
  DRIVER_UPDATE = 'driver:update',
  DRIVER_DELETE = 'driver:delete',

  // Customers
  CUSTOMER_CREATE = 'customer:create',
  CUSTOMER_READ = 'customer:read',
  CUSTOMER_UPDATE = 'customer:update',
  CUSTOMER_DELETE = 'customer:delete',

  // Orders
  ORDER_CREATE = 'order:create',
  ORDER_READ = 'order:read',
  ORDER_UPDATE = 'order:update',
  ORDER_DELETE = 'order:delete',
  ORDER_APPROVE = 'order:approve',
  ORDER_CANCEL = 'order:cancel',

  // Billing
  BILLING_CREATE = 'billing:create',
  BILLING_READ = 'billing:read',
  BILLING_UPDATE = 'billing:update',
  BILLING_DELETE = 'billing:delete',
  BILLING_APPROVE = 'billing:approve',

  // Documents
  DOCUMENT_CREATE = 'document:create',
  DOCUMENT_READ = 'document:read',
  DOCUMENT_UPDATE = 'document:update',
  DOCUMENT_DELETE = 'document:delete',
  DOCUMENT_APPROVE = 'document:approve',

  // Legal
  LEGAL_CREATE = 'legal:create',
  LEGAL_READ = 'legal:read',
  LEGAL_UPDATE = 'legal:update',
  LEGAL_DELETE = 'legal:delete',
  LEGAL_APPROVE = 'legal:approve',

  // Reports
  REPORT_VIEW = 'report:view',
  REPORT_EXPORT = 'report:export',

  // Settings
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',

  // Admin
  ADMIN_ALL = 'admin:*',
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<Permission[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role === 'super_admin' || user.permissions?.includes(Permission.ADMIN_ALL)) {
      return true;
    }

    const userPermissions = user.permissions || [];

    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}

