import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // If user has 'all' permissions (super admin), allow
    if (user.permissions && user.permissions.includes('all')) {
      return true;
    }

    // Check if user has all required permissions
    if (user.permissions && Array.isArray(user.permissions)) {
      return requiredPermissions.every(permission =>
        user.permissions.includes(permission)
      );
    }

    return false;
  }
}
