import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// WMS Permissions Decorator
export const WMS_PERMISSIONS_KEY = 'wmsPermissions';
export const WmsPermissions = (...permissions: string[]) =>
  SetMetadata(WMS_PERMISSIONS_KEY, permissions);

