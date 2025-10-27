import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGuardProps {
  children: React.ReactNode;
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean; // for permissions
  fallback?: React.ReactNode;
  showMessage?: boolean;
}

export function PermissionGuard({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback,
  showMessage = true,
}: PermissionGuardProps) {
  const { hasPermission, hasRole, user } = useAuth();

  // Check if user has access
  const hasAccess = () => {
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

  if (!hasAccess()) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showMessage) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600">
              You don't have permission to access this section.
            </p>
            {user && (
              <p className="text-xs text-gray-500 mt-2">
                Contact your administrator if you need access.
              </p>
            )}
          </div>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}

interface RoleGuardProps {
  children: React.ReactNode;
  roles: string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, roles, fallback }: RoleGuardProps) {
  return (
    <PermissionGuard roles={roles} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminGuard({ children, fallback }: AdminGuardProps) {
  return (
    <PermissionGuard roles={['admin', 'super_admin']} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

interface ManagerGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ManagerGuard({ children, fallback }: ManagerGuardProps) {
  return (
    <PermissionGuard roles={['manager', 'admin', 'super_admin']} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}
