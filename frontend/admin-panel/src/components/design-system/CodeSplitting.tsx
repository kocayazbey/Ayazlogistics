import { lazy, Suspense, ComponentType } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

// Lazy load components with error boundaries
export const lazyLoad = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: ComponentType
) => {
  const LazyComponent = lazy(importFunc);

  return (props: any) => (
    <Suspense fallback={<LoadingSpinner />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Pre-configured lazy components
export const LazyDashboard = lazyLoad(() => import('../dashboard/Dashboard'));
export const LazyWarehouseManagement = lazyLoad(() => import('../warehouse/WarehouseManagement'));
export const LazyTransportManagement = lazyLoad(() => import('../transport/TransportManagement'));
export const LazyBillingManagement = lazyLoad(() => import('../billing/BillingManagement'));
export const LazyCustomerManagement = lazyLoad(() => import('../customer/CustomerManagement'));
export const LazyAnalytics = lazyLoad(() => import('../analytics/Analytics'));
export const LazySettings = lazyLoad(() => import('../settings/Settings'));
export const LazyReports = lazyLoad(() => import('../reports/Reports'));
export const LazyInventory = lazyLoad(() => import('../inventory/Inventory'));
export const LazyOrders = lazyLoad(() => import('../orders/Orders'));
export const LazyDrivers = lazyLoad(() => import('../drivers/Drivers'));
export const LazyVehicles = lazyLoad(() => import('../vehicles/Vehicles'));
export const LazyRoutes = lazyLoad(() => import('../routes/Routes'));
export const LazyTracking = lazyLoad(() => import('../tracking/Tracking'));
export const LazyNotifications = lazyLoad(() => import('../notifications/Notifications'));
export const LazyUsers = lazyLoad(() => import('../users/Users'));
export const LazyRoles = lazyLoad(() => import('../roles/Roles'));
export const LazyPermissions = lazyLoad(() => import('../permissions/Permissions'));
export const LazyAuditLogs = lazyLoad(() => import('../audit/AuditLogs'));
export const LazySystemHealth = lazyLoad(() => import('../system/SystemHealth'));
export const LazyIntegrations = lazyLoad(() => import('../integrations/Integrations'));
export const LazyWebhooks = lazyLoad(() => import('../webhooks/Webhooks'));
export const LazyAPIKeys = lazyLoad(() => import('../api-keys/APIKeys'));
export const LazyDocumentation = lazyLoad(() => import('../documentation/Documentation'));
export const LazyHelp = lazyLoad(() => import('../help/Help'));
export const LazySupport = lazyLoad(() => import('../support/Support'));
