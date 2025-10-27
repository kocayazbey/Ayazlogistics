'use client';

import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from './auth/PermissionGuard';
import { t } from '@/lib/i18n';

interface WMSPermissionGuardProps {
  children: React.ReactNode;
  requiredPermissions?: string | string[];
  requiredRoles?: string[];
  fallback?: React.ReactNode;
  requireAll?: boolean;
}

export default function WMSPermissionGuard({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  fallback,
  requireAll = false,
}: WMSPermissionGuardProps) {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions].filter(Boolean);

  return (
    <PermissionGuard
      permissions={permissions}
      roles={requiredRoles}
      requireAll={requireAll}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}
