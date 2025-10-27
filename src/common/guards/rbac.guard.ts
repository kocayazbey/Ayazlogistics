import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'list' | 'execute';
}

export const PERMISSIONS_KEY = 'permissions';
export const ROLES_KEY = 'roles';

// Decorator for permissions
export const RequirePermissions = (...permissions: Permission[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    Reflector.createDecorator<Permission[]>()(permissions)(target, propertyKey!, descriptor!);
    Reflect.defineMetadata(PERMISSIONS_KEY, permissions, target, propertyKey!);
  };
};

// Decorator for roles
export const RequireRoles = (...roles: string[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    Reflector.createDecorator<string[]>()(roles)(target, propertyKey!, descriptor!);
    Reflect.defineMetadata(ROLES_KEY, roles, target, propertyKey!);
  };
};

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check role-based access
    const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = this.checkRoles(user, requiredRoles);
      if (!hasRole) {
        throw new ForbiddenException(`Required roles: ${requiredRoles.join(', ')}`);
      }
    }

    // Check permission-based access
    const requiredPermissions = this.reflector.get<Permission[]>(PERMISSIONS_KEY, context.getHandler());
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = await this.checkPermissions(user, requiredPermissions);
      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // Check tenant isolation
    const tenantId = request.params.tenantId || request.body?.tenantId || request.query?.tenantId;
    if (tenantId && user.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied: Tenant mismatch');
    }

    return true;
  }

  private checkRoles(user: any, requiredRoles: string[]): boolean {
    if (!user.roles || user.roles.length === 0) {
      return false;
    }

    // Super admin has access to everything
    if (user.roles.includes('super_admin')) {
      return true;
    }

    // Check if user has any of the required roles
    return requiredRoles.some(role => user.roles.includes(role));
  }

  private async checkPermissions(user: any, requiredPermissions: Permission[]): boolean {
    if (!user.permissions || user.permissions.length === 0) {
      return false;
    }

    // Super admin has all permissions
    if (user.roles && user.roles.includes('super_admin')) {
      return true;
    }

    // Check if user has all required permissions
    return requiredPermissions.every(required => {
      return user.permissions.some((userPerm: Permission) => {
        return (
          userPerm.resource === required.resource &&
          (userPerm.action === required.action || userPerm.action === '*')
        );
      });
    });
  }
}

// Permission matrix by role
export const RolePermissionMatrix = {
  super_admin: '*', // All permissions
  
  admin: [
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'list' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'update' },
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update' },
    { resource: 'reports', action: 'read' },
    { resource: 'analytics', action: 'read' },
  ],

  warehouse_manager: [
    { resource: 'warehouse', action: 'read' },
    { resource: 'warehouse', action: 'list' },
    { resource: 'warehouse', action: 'update' },
    { resource: 'inventory', action: 'read' },
    { resource: 'inventory', action: 'list' },
    { resource: 'inventory', action: 'update' },
    { resource: 'receiving', action: 'read' },
    { resource: 'receiving', action: 'create' },
    { resource: 'receiving', action: 'update' },
    { resource: 'shipping', action: 'read' },
    { resource: 'shipping', action: 'create' },
    { resource: 'reports', action: 'read' },
  ],

  warehouse_operator: [
    { resource: 'receiving', action: 'read' },
    { resource: 'receiving', action: 'create' },
    { resource: 'picking', action: 'read' },
    { resource: 'picking', action: 'execute' },
    { resource: 'packing', action: 'read' },
    { resource: 'packing', action: 'execute' },
    { resource: 'inventory', action: 'read' },
    { resource: 'inventory', action: 'list' },
  ],

  customer: [
    { resource: 'orders', action: 'read' },
    { resource: 'orders', action: 'list' },
    { resource: 'orders', action: 'create' },
    { resource: 'shipments', action: 'read' },
    { resource: 'tracking', action: 'read' },
    { resource: 'invoices', action: 'read' },
    { resource: 'documents', action: 'read' },
  ],

  driver: [
    { resource: 'routes', action: 'read' },
    { resource: 'deliveries', action: 'read' },
    { resource: 'deliveries', action: 'update' },
    { resource: 'tracking', action: 'update' },
  ],

  accountant: [
    { resource: 'invoices', action: 'read' },
    { resource: 'invoices', action: 'list' },
    { resource: 'invoices', action: 'create' },
    { resource: 'invoices', action: 'update' },
    { resource: 'billing', action: 'read' },
    { resource: 'billing', action: 'create' },
    { resource: 'payments', action: 'read' },
    { resource: 'financial_reports', action: 'read' },
  ],
};

// Helper function to assign permissions to user
export function assignRolePermissions(role: string): Permission[] {
  if (role === 'super_admin') {
    return [{ resource: '*', action: 'execute' }];
  }

  return (RolePermissionMatrix[role as keyof typeof RolePermissionMatrix] as Permission[]) || [];
}

