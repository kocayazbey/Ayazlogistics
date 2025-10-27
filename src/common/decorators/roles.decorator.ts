import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  TENANT_ADMIN = 'tenant_admin',
  MANAGER = 'manager',
  WAREHOUSE_MANAGER = 'warehouse_manager',
  DRIVER = 'driver',
  CUSTOMER = 'customer',
  CUSTOMER_USER = 'customer_user',
  LEGAL_OFFICER = 'legal_officer',
  FINANCE_OFFICER = 'finance_officer',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const AdminOnly = () => Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TENANT_ADMIN);

export const ManagerOrAbove = () =>
  Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TENANT_ADMIN, Role.MANAGER);

export const WarehouseStaff = () =>
  Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.TENANT_ADMIN,
    Role.MANAGER,
    Role.WAREHOUSE_MANAGER,
    Role.OPERATOR,
  );

export const LegalOnly = () =>
  Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.LEGAL_OFFICER);

export const FinanceOnly = () =>
  Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.FINANCE_OFFICER);

