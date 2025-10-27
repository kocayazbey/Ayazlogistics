import { SetMetadata } from '@nestjs/common';

/**
 * WMS Permissions Decorator
 * Use this to protect endpoints with specific permissions
 */
export const WmsPermissions = (...permissions: string[]) => 
  SetMetadata('permissions', permissions);

/**
 * Common WMS Permission Constants
 */
export const WMS_PERMISSIONS = {
  // Warehouse Management
  WAREHOUSE_CREATE: 'wms.warehouse.create',
  WAREHOUSE_EDIT: 'wms.warehouse.edit',
  WAREHOUSE_DELETE: 'wms.warehouse.delete',
  WAREHOUSE_VIEW: 'wms.warehouse.view',

  // Location Management
  LOCATION_CREATE: 'wms.location.create',
  LOCATION_EDIT: 'wms.location.edit',
  LOCATION_DELETE: 'wms.location.delete',
  LOCATION_VIEW: 'wms.location.view',

  // Receiving
  RECEIVING_CREATE: 'wms.receiving.create',
  RECEIVING_EXECUTE: 'wms.receiving.execute',
  RECEIVING_COMPLETE: 'wms.receiving.complete',
  RECEIVING_CANCEL: 'wms.receiving.cancel',
  RECEIVING_VIEW: 'wms.receiving.view',

  // Picking
  PICKING_CREATE: 'wms.picking.create',
  PICKING_EXECUTE: 'wms.picking.execute',
  PICKING_COMPLETE: 'wms.picking.complete',
  PICKING_CANCEL: 'wms.picking.cancel',
  PICKING_VIEW: 'wms.picking.view',

  // Shipping
  SHIPPING_CREATE: 'wms.shipping.create',
  SHIPPING_SHIP: 'wms.shipping.ship',
  SHIPPING_CANCEL: 'wms.shipping.cancel',
  SHIPPING_VIEW: 'wms.shipping.view',

  // Inventory
  INVENTORY_VIEW: 'wms.inventory.view',
  INVENTORY_ADJUST: 'wms.inventory.adjust',
  INVENTORY_TRANSFER: 'wms.inventory.transfer',

  // Cycle Count
  CYCLE_COUNT_CREATE: 'wms.cycle_count.create',
  CYCLE_COUNT_EXECUTE: 'wms.cycle_count.execute',
  CYCLE_COUNT_RECONCILE: 'wms.cycle_count.reconcile',

  // Analytics & Reports
  REPORTS_VIEW: 'wms.reports.view',
  REPORTS_EXPORT: 'wms.reports.export',
  ANALYTICS_VIEW: 'wms.analytics.view',

  // Advanced Features
  SLOTTING_ANALYZE: 'wms.slotting.analyze',
  SLOTTING_EXECUTE: 'wms.slotting.execute',
  WAVE_CREATE: 'wms.wave.create',
  WAVE_RELEASE: 'wms.wave.release',

  // Admin
  SETTINGS_MANAGE: 'wms.settings.manage',
  BILLING_VIEW: 'wms.billing.view',

  // Production Integration
  PRODUCTION_CREATE: 'wms.production.create',
  PRODUCTION_VIEW: 'wms.production.view',
  PRODUCTION_HANDOVER: 'wms.production.handover',
  PRODUCTION_APPROVE: 'wms.production.approve',
  PRODUCTION_REJECT: 'wms.production.reject',

  // Supervisor Operations
  SUPERVISOR_PICKFACE_CHANGE: 'wms.supervisor.pickface.change',
  SUPERVISOR_PALLET_MODIFY: 'wms.supervisor.pallet.modify',
  SUPERVISOR_BARCODE_DEFINE: 'wms.supervisor.barcode.define',
  SUPERVISOR_STANDARDS_SET: 'wms.supervisor.standards.set',
  SUPERVISOR_BLOCK: 'wms.supervisor.block',
  SUPERVISOR_UNBLOCK: 'wms.supervisor.unblock',

  // Zone Management
  ZONE_CREATE: 'wms.zone.create',
  ZONE_VIEW: 'wms.zone.view',
  ZONE_MANAGE: 'wms.zone.manage',
  ZONE_BULK_CREATE: 'wms.zone.bulk.create',
  ZONE_STRATEGY_CREATE: 'wms.zone.strategy.create',
  ZONE_ROUTE_CREATE: 'wms.zone.route.create',

  // Carrier Management
  CARRIER_CREATE: 'wms.carrier.create',
  CARRIER_EDIT: 'wms.carrier.edit',
  CARRIER_DELETE: 'wms.carrier.delete',
  CARRIER_VIEW: 'wms.carrier.view',
  CARRIER_PERFORMANCE_VIEW: 'wms.carrier.performance.view',

  // Warehouse Management
  WAREHOUSE_CREATE: 'wms.warehouse.create',
  WAREHOUSE_EDIT: 'wms.warehouse.edit',
  WAREHOUSE_DELETE: 'wms.warehouse.delete',
  WAREHOUSE_VIEW: 'wms.warehouse.view',

  // Intelligent Inventory
  INVENTORY_ANALYTICS_VIEW: 'wms.inventory.analytics.view',
  INVENTORY_ANALYTICS_RUN: 'wms.inventory.analytics.run',
  INVENTORY_OPTIMIZATION_VIEW: 'wms.inventory.optimization.view',
  INVENTORY_OPTIMIZATION_EXECUTE: 'wms.inventory.optimization.execute',
  INVENTORY_FORECAST_VIEW: 'wms.inventory.forecast.view',

  // Advanced Operations
  SHIPPING_ADVANCED_CREATE: 'wms.shipping.advanced.create',
  SHIPPING_ADVANCED_EXECUTE: 'wms.shipping.advanced.execute',
  SHIPPING_ADVANCED_MANAGE: 'wms.shipping.advanced.manage',
  CYCLE_COUNT_ADVANCED_CREATE: 'wms.cycle_count.advanced.create',
  CYCLE_COUNT_ADVANCED_EXECUTE: 'wms.cycle_count.advanced.execute',
  CYCLE_COUNT_ADVANCED_MANAGE: 'wms.cycle_count.advanced.manage',
  PERFORMANCE_VIEW: 'wms.performance.view',
  PERFORMANCE_MANAGE: 'wms.performance.manage',
  YARD_MANAGE: 'wms.yard.manage',
  YARD_VIEW: 'wms.yard.view',
  PACKAGING_CREATE: 'wms.packaging.create',
  PACKAGING_MANAGE: 'wms.packaging.manage',
  FORKLIFT_MANAGE: 'wms.forklift.manage',
  FORKLIFT_ASSIGN: 'wms.forklift.assign',
  PICKING_CART_MANAGE: 'wms.picking_cart.manage',
  PICKING_CART_ASSIGN: 'wms.picking_cart.assign',
  MONITORING_VIEW: 'wms.monitoring.view',
  MONITORING_MANAGE: 'wms.monitoring.manage',
};

/**
 * Usage Example:
 * 
 * @Post('warehouses')
 * @WmsPermissions(WMS_PERMISSIONS.WAREHOUSE_CREATE)
 * @UseGuards(JwtAuthGuard, WmsPermissionGuard)
 * async createWarehouse() {}
 */

