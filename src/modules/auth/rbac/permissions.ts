// Role-Based Access Control (RBAC) Permissions
export const PERMISSIONS = {
  // User Management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_LIST: 'user:list',

  // Warehouse Management System (WMS)
  WMS_DASHBOARD: 'wms:dashboard',
  WMS_INVENTORY: 'wms:inventory',
  WMS_RECEIVING: 'wms:receiving',
  WMS_PICKING: 'wms:picking',
  WMS_PACKING: 'wms:packing',
  WMS_SHIPPING: 'wms:shipping',
  WMS_RETURNS: 'wms:returns',
  WMS_REPORTS: 'wms:reports',

  // Transportation Management System (TMS)
  TMS_DASHBOARD: 'tms:dashboard',
  TMS_ROUTES: 'tms:routes',
  TMS_VEHICLES: 'tms:vehicles',
  TMS_DRIVERS: 'tms:drivers',
  TMS_TRACKING: 'tms:tracking',
  TMS_DELIVERY: 'tms:delivery',

  // Customer Relationship Management (CRM)
  CRM_DASHBOARD: 'crm:dashboard',
  CRM_CUSTOMERS: 'crm:customers',
  CRM_ORDERS: 'crm:orders',
  CRM_SUPPORT: 'crm:support',

  // Enterprise Resource Planning (ERP)
  ERP_DASHBOARD: 'erp:dashboard',
  ERP_FINANCE: 'erp:finance',
  ERP_PROCUREMENT: 'erp:procurement',
  ERP_HR: 'erp:hr',
  ERP_ANALYTICS: 'erp:analytics',

  // System Administration
  ADMIN_USERS: 'admin:users',
  ADMIN_ROLES: 'admin:roles',
  ADMIN_PERMISSIONS: 'admin:permissions',
  ADMIN_SYSTEM: 'admin:system',
  ADMIN_AUDIT: 'admin:audit',
  ADMIN_BACKUP: 'admin:backup',

  // Payment & Billing
  PAYMENT_PROCESS: 'payment:process',
  PAYMENT_REFUND: 'payment:refund',
  BILLING_INVOICE: 'billing:invoice',
  BILLING_REPORTS: 'billing:reports',

  // Mobile Access
  MOBILE_TASKS: 'mobile:tasks',
  MOBILE_SCANNING: 'mobile:scanning',
  MOBILE_REPORTING: 'mobile:reporting',

  // API Access
  API_READ: 'api:read',
  API_WRITE: 'api:write',
  API_ADMIN: 'api:admin',

  // All permissions (super admin)
  ALL: 'all',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role definitions with permissions
export const ROLES = {
  SUPER_ADMIN: {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: [PERMISSIONS.ALL],
  },

  ADMIN: {
    name: 'admin',
    displayName: 'Administrator',
    description: 'System administration with user and role management',
    permissions: [
      PERMISSIONS.ADMIN_USERS,
      PERMISSIONS.ADMIN_ROLES,
      PERMISSIONS.ADMIN_PERMISSIONS,
      PERMISSIONS.ADMIN_SYSTEM,
      PERMISSIONS.ADMIN_AUDIT,
      PERMISSIONS.ADMIN_BACKUP,
      PERMISSIONS.USER_LIST,
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.WMS_DASHBOARD,
      PERMISSIONS.TMS_DASHBOARD,
      PERMISSIONS.CRM_DASHBOARD,
      PERMISSIONS.ERP_DASHBOARD,
      PERMISSIONS.PAYMENT_PROCESS,
      PERMISSIONS.BILLING_INVOICE,
      PERMISSIONS.BILLING_REPORTS,
      PERMISSIONS.API_ADMIN,
    ],
  },

  MANAGER: {
    name: 'manager',
    displayName: 'Manager',
    description: 'Department management with oversight capabilities',
    permissions: [
      PERMISSIONS.USER_LIST,
      PERMISSIONS.USER_READ,
      PERMISSIONS.WMS_DASHBOARD,
      PERMISSIONS.WMS_INVENTORY,
      PERMISSIONS.WMS_RECEIVING,
      PERMISSIONS.WMS_PICKING,
      PERMISSIONS.WMS_PACKING,
      PERMISSIONS.WMS_SHIPPING,
      PERMISSIONS.WMS_RETURNS,
      PERMISSIONS.WMS_REPORTS,
      PERMISSIONS.TMS_DASHBOARD,
      PERMISSIONS.TMS_ROUTES,
      PERMISSIONS.TMS_VEHICLES,
      PERMISSIONS.TMS_DRIVERS,
      PERMISSIONS.TMS_TRACKING,
      PERMISSIONS.CRM_DASHBOARD,
      PERMISSIONS.CRM_CUSTOMERS,
      PERMISSIONS.CRM_ORDERS,
      PERMISSIONS.ERP_DASHBOARD,
      PERMISSIONS.ERP_FINANCE,
      PERMISSIONS.ERP_ANALYTICS,
      PERMISSIONS.BILLING_REPORTS,
      PERMISSIONS.API_READ,
      PERMISSIONS.API_WRITE,
    ],
  },

  WAREHOUSE_WORKER: {
    name: 'warehouse_worker',
    displayName: 'Warehouse Worker',
    description: 'Warehouse operations and inventory management',
    permissions: [
      PERMISSIONS.WMS_DASHBOARD,
      PERMISSIONS.WMS_INVENTORY,
      PERMISSIONS.WMS_RECEIVING,
      PERMISSIONS.WMS_PICKING,
      PERMISSIONS.WMS_PACKING,
      PERMISSIONS.WMS_SHIPPING,
      PERMISSIONS.MOBILE_TASKS,
      PERMISSIONS.MOBILE_SCANNING,
      PERMISSIONS.API_READ,
    ],
  },

  DRIVER: {
    name: 'driver',
    displayName: 'Driver',
    description: 'Transportation and delivery operations',
    permissions: [
      PERMISSIONS.TMS_DASHBOARD,
      PERMISSIONS.TMS_TRACKING,
      PERMISSIONS.TMS_DELIVERY,
      PERMISSIONS.MOBILE_TASKS,
      PERMISSIONS.MOBILE_REPORTING,
      PERMISSIONS.API_READ,
    ],
  },

  CUSTOMER: {
    name: 'customer',
    displayName: 'Customer',
    description: 'Customer portal access',
    permissions: [
      PERMISSIONS.CRM_DASHBOARD,
      PERMISSIONS.CRM_ORDERS,
      PERMISSIONS.TMS_TRACKING,
      PERMISSIONS.API_READ,
    ],
  },

  GUEST: {
    name: 'guest',
    displayName: 'Guest',
    description: 'Limited read-only access',
    permissions: [
      PERMISSIONS.API_READ,
    ],
  },
} as const;

export type Role = keyof typeof ROLES;

// Helper functions
export function getRolePermissions(roleName: Role): Permission[] {
  return ROLES[roleName].permissions;
}

export function hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
  return userPermissions.includes(PERMISSIONS.ALL) || userPermissions.includes(requiredPermission);
}

export function hasAnyPermission(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
  return userPermissions.includes(PERMISSIONS.ALL) ||
         requiredPermissions.some(permission => userPermissions.includes(permission));
}

export function getAllPermissions(): Permission[] {
  return Object.values(PERMISSIONS);
}

export function getAllRoles(): Role[] {
  return Object.keys(ROLES) as Role[];
}
