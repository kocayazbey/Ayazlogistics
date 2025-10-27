import { Injectable } from '@nestjs/common';

/**
 * Web Screen Configuration Service
 * Provides dashboard and screen configurations for WMS web application
 */
@Injectable()
export class WebScreenService {

  /**
   * Get dashboard configuration
   */
  getDashboardConfig() {
    return {
      widgets: [
        {
          id: 'inventory_overview',
          title: 'Inventory Overview',
          type: 'stats',
          position: { x: 0, y: 0, width: 3, height: 2 },
          dataSource: '/api/v1/wms/analytics/inventory-overview',
        },
        {
          id: 'active_operations',
          title: 'Active Operations',
          type: 'list',
          position: { x: 3, y: 0, width: 3, height: 2 },
          dataSource: '/api/v1/wms/analytics/active-operations',
        },
        {
          id: 'receiving_chart',
          title: 'Receiving Trends',
          type: 'line_chart',
          position: { x: 0, y: 2, width: 6, height: 3 },
          dataSource: '/api/v1/wms/analytics/receiving-trends',
        },
        {
          id: 'picking_performance',
          title: 'Picking Performance',
          type: 'bar_chart',
          position: { x: 6, y: 0, width: 3, height: 3 },
          dataSource: '/api/v1/wms/analytics/picking-performance',
        },
        {
          id: 'warehouse_utilization',
          title: 'Warehouse Utilization',
          type: 'gauge',
          position: { x: 9, y: 0, width: 3, height: 2 },
          dataSource: '/api/v1/wms/analytics/utilization',
        },
        {
          id: 'recent_shipments',
          title: 'Recent Shipments',
          type: 'table',
          position: { x: 6, y: 3, width: 6, height: 3 },
          dataSource: '/api/v1/wms/shipments',
          columns: ['shipmentNumber', 'carrier', 'status', 'shippedAt'],
        },
        {
          id: 'low_stock_alerts',
          title: 'Low Stock Alerts',
          type: 'alert_list',
          position: { x: 9, y: 2, width: 3, height: 2 },
          dataSource: '/api/v1/wms/analytics/low-stock',
        },
      ],
      refreshInterval: 30000, // 30 seconds
      theme: 'ios',
    };
  }

  /**
   * Get warehouse management screen config
   */
  getWarehouseManagementConfig() {
    return {
      screenId: 'warehouse_management',
      title: 'Warehouse Management',
      sections: [
        {
          id: 'warehouse_list',
          title: 'Warehouses',
          type: 'data_grid',
          columns: [
            { field: 'code', header: 'Code', sortable: true, filterable: true },
            { field: 'name', header: 'Name', sortable: true, filterable: true },
            { field: 'city', header: 'City', sortable: true, filterable: true },
            { field: 'status', header: 'Status', sortable: true, filterable: true, type: 'badge' },
            { field: 'totalArea', header: 'Total Area (sqm)', sortable: true, type: 'number' },
            { field: 'utilization', header: 'Utilization %', sortable: true, type: 'progress' },
          ],
          actions: ['view', 'edit', 'delete', 'export'],
        },
        {
          id: 'location_hierarchy',
          title: 'Location Hierarchy',
          type: 'tree_view',
          levels: ['zone', 'aisle', 'rack', 'shelf', 'bin'],
        },
      ],
    };
  }

  /**
   * Get inventory management screen config
   */
  getInventoryManagementConfig() {
    return {
      screenId: 'inventory_management',
      title: 'Inventory Management',
      filters: [
        { field: 'warehouse', type: 'select', label: 'Warehouse' },
        { field: 'product', type: 'autocomplete', label: 'Product' },
        { field: 'zone', type: 'select', label: 'Zone' },
        { field: 'stockLevel', type: 'range', label: 'Stock Level' },
        { field: 'expiryDate', type: 'date_range', label: 'Expiry Date' },
      ],
      columns: [
        { field: 'sku', header: 'SKU', pinned: true },
        { field: 'productName', header: 'Product Name', width: 200 },
        { field: 'location', header: 'Location' },
        { field: 'quantityOnHand', header: 'On Hand', type: 'number' },
        { field: 'quantityAvailable', header: 'Available', type: 'number' },
        { field: 'quantityAllocated', header: 'Allocated', type: 'number' },
        { field: 'lotNumber', header: 'Lot #' },
        { field: 'expiryDate', header: 'Expiry Date', type: 'date' },
        { field: 'lastMovement', header: 'Last Movement', type: 'datetime' },
      ],
      bulkActions: ['adjust', 'transfer', 'reserve', 'export'],
      exportFormats: ['excel', 'csv', 'pdf'],
    };
  }

  /**
   * Get receiving orders screen config
   */
  getReceivingOrdersConfig() {
    return {
      screenId: 'receiving_orders',
      title: 'Receiving Orders',
      tabs: [
        { id: 'pending', label: 'Pending', count: 0 },
        { id: 'in_progress', label: 'In Progress', count: 0 },
        { id: 'completed', label: 'Completed', count: 0 },
        { id: 'cancelled', label: 'Cancelled', count: 0 },
      ],
      columns: [
        { field: 'receivingNumber', header: 'Receiving #', linkTo: 'detail' },
        { field: 'poNumber', header: 'PO #' },
        { field: 'supplier', header: 'Supplier' },
        { field: 'expectedDate', header: 'Expected Date', type: 'date' },
        { field: 'status', header: 'Status', type: 'status_badge' },
        { field: 'receivedBy', header: 'Received By' },
        { field: 'createdAt', header: 'Created', type: 'datetime' },
      ],
      actions: ['create', 'view', 'start', 'complete', 'cancel', 'print'],
    };
  }

  /**
   * Get picking orders screen config
   */
  getPickingOrdersConfig() {
    return {
      screenId: 'picking_orders',
      title: 'Picking Orders',
      filters: [
        { field: 'status', type: 'multi_select', label: 'Status' },
        { field: 'priority', type: 'select', label: 'Priority' },
        { field: 'assignedTo', type: 'select', label: 'Assigned To' },
        { field: 'pickingType', type: 'select', label: 'Picking Type' },
      ],
      columns: [
        { field: 'pickingNumber', header: 'Picking #', linkTo: 'detail' },
        { field: 'orderNumber', header: 'Order #' },
        { field: 'pickingType', header: 'Type', type: 'badge' },
        { field: 'priority', header: 'Priority', type: 'priority_badge' },
        { field: 'assignedTo', header: 'Assigned To' },
        { field: 'status', header: 'Status', type: 'status_badge' },
        { field: 'startedAt', header: 'Started', type: 'datetime' },
        { field: 'completedAt', header: 'Completed', type: 'datetime' },
      ],
      actions: ['create_wave', 'assign', 'release', 'cancel', 'print_list'],
    };
  }

  /**
   * Get reports screen config
   */
  getReportsConfig() {
    return {
      screenId: 'reports',
      title: 'WMS Reports',
      categories: [
        {
          id: 'inventory',
          name: 'Inventory Reports',
          reports: [
            { id: 'inventory_valuation', name: 'Inventory Valuation', icon: 'dollar' },
            { id: 'abc_analysis', name: 'ABC Analysis', icon: 'bar-chart' },
            { id: 'aging_report', name: 'Inventory Aging', icon: 'calendar' },
            { id: 'lot_trace', name: 'Lot Traceability', icon: 'search' },
          ],
        },
        {
          id: 'operations',
          name: 'Operations Reports',
          reports: [
            { id: 'receiving_summary', name: 'Receiving Summary', icon: 'inbox' },
            { id: 'picking_performance', name: 'Picking Performance', icon: 'trending-up' },
            { id: 'cycle_count_accuracy', name: 'Cycle Count Accuracy', icon: 'check-circle' },
            { id: 'shipment_summary', name: 'Shipment Summary', icon: 'truck' },
          ],
        },
        {
          id: 'productivity',
          name: 'Productivity Reports',
          reports: [
            { id: 'worker_productivity', name: 'Worker Productivity', icon: 'users' },
            { id: 'equipment_utilization', name: 'Equipment Utilization', icon: 'cpu' },
            { id: 'space_utilization', name: 'Space Utilization', icon: 'grid' },
          ],
        },
        {
          id: 'financial',
          name: 'Financial Reports',
          reports: [
            { id: 'billing_summary', name: 'Billing Summary', icon: 'file-text' },
            { id: 'cost_analysis', name: 'Cost Analysis', icon: 'pie-chart' },
            { id: 'usage_trends', name: 'Usage Trends', icon: 'activity' },
          ],
        },
      ],
    };
  }

  /**
   * Get settings screen config
   */
  getSettingsConfig() {
    return {
      screenId: 'settings',
      title: 'WMS Settings',
      sections: [
        {
          id: 'general',
          title: 'General Settings',
          settings: [
            { key: 'default_uom', label: 'Default Unit of Measure', type: 'select' },
            { key: 'auto_allocate', label: 'Auto-allocate inventory', type: 'toggle' },
            { key: 'require_lot_numbers', label: 'Require lot numbers', type: 'toggle' },
            { key: 'enable_serial_tracking', label: 'Enable serial tracking', type: 'toggle' },
          ],
        },
        {
          id: 'receiving',
          title: 'Receiving Settings',
          settings: [
            { key: 'auto_putaway', label: 'Auto-suggest putaway locations', type: 'toggle' },
            { key: 'quality_check_required', label: 'Quality check required', type: 'toggle' },
            { key: 'asn_required', label: 'ASN required', type: 'toggle' },
          ],
        },
        {
          id: 'picking',
          title: 'Picking Settings',
          settings: [
            { key: 'default_strategy', label: 'Default Picking Strategy', type: 'select' },
            { key: 'enable_voice_picking', label: 'Enable voice picking', type: 'toggle' },
            { key: 'batch_picking_limit', label: 'Batch picking limit', type: 'number' },
          ],
        },
        {
          id: 'integrations',
          title: 'Integrations',
          settings: [
            { key: 'billing_enabled', label: 'Enable automatic billing', type: 'toggle' },
            { key: 'erp_sync', label: 'Sync with ERP', type: 'toggle' },
            { key: 'rfid_enabled', label: 'RFID enabled', type: 'toggle' },
            { key: 'agv_enabled', label: 'AGV integration enabled', type: 'toggle' },
          ],
        },
      ],
    };
  }
}

