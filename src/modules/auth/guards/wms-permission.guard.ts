import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WMS_PERMISSIONS_KEY } from '../decorators/roles.decorator';

@Injectable()
export class WmsPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      WMS_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Admin her şeye erişebilir
    if (user.role === 'admin') {
      return true;
    }

    // Kullanıcının permission'ları var mı kontrol et
    if (!user.permissions || !Array.isArray(user.permissions)) {
      return false;
    }

    // Gerekli permission'lardan en az biri var mı kontrol et (OR logic)
    return requiredPermissions.some((permission) =>
      user.permissions.includes(permission) || user.permissions.includes('*')
    );
  }
}
