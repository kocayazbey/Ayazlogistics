import { useAuth } from '@/contexts/AuthContext';

export interface PermissionCheckOptions {
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean;
}

export function usePermissions() {
  const { hasPermission, hasRole, user } = useAuth();

  const checkAccess = (options: PermissionCheckOptions): boolean => {
    const { permissions = [], roles = [], requireAll = false } = options;

    // Super admin has access to everything
    if (hasRole('super_admin')) {
      return true;
    }

    // Check roles
    if (roles.length > 0) {
      const hasRequiredRole = roles.some(role => hasRole(role));
      if (!hasRequiredRole) {
        return false;
      }
    }

    // Check permissions
    if (permissions.length > 0) {
      if (requireAll) {
        // User must have ALL permissions
        return permissions.every(permission => hasPermission(permission));
      } else {
        // User must have at least ONE permission
        return permissions.some(permission => hasPermission(permission));
      }
    }

    // If no permissions or roles specified, allow access
    return true;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const canAccessWMS = (): boolean => {
    return checkAccess({
      permissions: ['wms.view', 'wms.manage', 'wms.operations.view', 'wms.inventory.view'],
      roles: ['operator', 'manager', 'admin', 'super_admin'],
    });
  };

  const canAccessTMS = (): boolean => {
    return checkAccess({
      permissions: ['tms.view', 'tms.manage', 'tms.routes.view', 'tms.vehicles.view'],
      roles: ['driver', 'operator', 'manager', 'admin', 'super_admin'],
    });
  };

  const canAccessBilling = (): boolean => {
    return checkAccess({
      permissions: ['billing.view', 'billing.manage', 'billing.invoices.view'],
      roles: ['manager', 'admin', 'super_admin'],
    });
  };

  const canAccessAnalytics = (): boolean => {
    return checkAccess({
      permissions: ['analytics.view', 'analytics.reports.view'],
      roles: ['manager', 'admin', 'super_admin'],
    });
  };

  const canManageUsers = (): boolean => {
    return checkAccess({
      permissions: ['users.manage', 'users.create', 'users.update'],
      roles: ['admin', 'super_admin'],
    });
  };

  const canManageSettings = (): boolean => {
    return checkAccess({
      permissions: ['settings.manage', 'system.configure'],
      roles: ['admin', 'super_admin'],
    });
  };

  return {
    checkAccess,
    hasAnyPermission,
    hasAllPermissions,
    hasAnyRole,
    canAccessWMS,
    canAccessTMS,
    canAccessBilling,
    canAccessAnalytics,
    canManageUsers,
    canManageSettings,
    user,
  };
}

// HOC for permission-based conditional rendering
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  options: PermissionCheckOptions
) {
  return function PermissionWrappedComponent(props: P) {
    const { checkAccess } = usePermissions();

    if (!checkAccess(options)) {
      return null;
    }

    return <Component {...props} />;
  };
}

// Component for inline permission checks
interface ConditionalRenderProps {
  children: React.ReactNode;
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

export function ConditionalRender({
  children,
  permissions,
  roles,
  requireAll = false,
  fallback = null,
}: ConditionalRenderProps) {
  const { checkAccess } = usePermissions();

  if (!checkAccess({ permissions, roles, requireAll })) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
