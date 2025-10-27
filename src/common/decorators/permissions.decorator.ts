import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY, ROLES_KEY } from '../guards/permission.guard';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireRoles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);