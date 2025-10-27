/**
 * WMS Configuration
 * Central configuration for WMS module
 */

export interface WmsModuleConfig {
  // Feature flags
  features: {
    voicePicking: boolean;
    rfid: boolean;
    agv: boolean;
    qualityControl: boolean;
    advancedSlotting: boolean;
    wavePicking: boolean;
    crossDocking: boolean;
  };

  // Operational settings
  operations: {
    defaultPickingStrategy: 'FIFO' | 'LIFO' | 'FEFO' | 'ZONE' | 'BATCH';
    autoAllocateInventory: boolean;
    requireQualityCheck: boolean;
    enableAutoPutaway: boolean;
    enableBatchPicking: boolean;
    maxWaveSize: number;
    cycleCountFrequency: 'daily' | 'weekly' | 'monthly';
  };

  // Billing integration
  billing: {
    enabled: boolean;
    autoTrackUsage: boolean;
    billingModels: string[];
  };

  // Performance settings
  performance: {
    cacheEnabled: boolean;
    cacheTTL: number;
    maxConcurrentOperations: number;
    queryTimeout: number;
  };

  // Localization
  localization: {
    defaultLanguage: string;
    supportedLanguages: string[];
    defaultCurrency: string;
    defaultTimeZone: string;
  };

  // Validation rules
  validation: {
    maxLineItems: number;
    maxPackagesPerShipment: number;
    maxQuantityPerLine: number;
    requireLotNumbers: boolean;
    requireSerialNumbers: boolean;
  };
}

export const defaultWmsConfig: WmsModuleConfig = {
  features: {
    voicePicking: true,
    rfid: true,
    agv: true,
    qualityControl: true,
    advancedSlotting: true,
    wavePicking: true,
    crossDocking: true,
  },

  operations: {
    defaultPickingStrategy: 'FIFO',
    autoAllocateInventory: true,
    requireQualityCheck: false,
    enableAutoPutaway: true,
    enableBatchPicking: true,
    maxWaveSize: 100,
    cycleCountFrequency: 'weekly',
  },

  billing: {
    enabled: true,
    autoTrackUsage: true,
    billingModels: ['handling', 'rack_storage', 'forklift_operator', 'waiting_time'],
  },

  performance: {
    cacheEnabled: true,
    cacheTTL: 300,
    maxConcurrentOperations: 100,
    queryTimeout: 30000,
  },

  localization: {
    defaultLanguage: 'tr-TR',
    supportedLanguages: ['tr-TR', 'en-US', 'es-ES'],
    defaultCurrency: 'TRY',
    defaultTimeZone: 'Europe/Istanbul',
  },

  validation: {
    maxLineItems: 1000,
    maxPackagesPerShipment: 100,
    maxQuantityPerLine: 999999,
    requireLotNumbers: false,
    requireSerialNumbers: false,
  },
};

/**
 * WMS Constants
 */
export const WmsConstants = {
  // Status values
  STATUS: {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    ON_HOLD: 'on_hold',
  },

  // Priority values
  PRIORITY: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent',
  },

  // Location types
  LOCATION_TYPES: {
    PICK: 'pick',
    RESERVE: 'reserve',
    STAGING: 'staging',
    DOCK: 'dock',
    HAZMAT: 'hazmat',
    COLD_STORAGE: 'cold_storage',
    RETURNS: 'returns',
  },

  // Picking strategies
  PICKING_STRATEGIES: {
    FIFO: 'FIFO',
    LIFO: 'LIFO',
    FEFO: 'FEFO',
    ZONE: 'ZONE',
    BATCH: 'BATCH',
  },

  // Units of measure
  UOM: {
    PIECE: 'piece',
    CARTON: 'carton',
    PALLET: 'pallet',
    KG: 'kg',
    LB: 'lb',
    HOUR: 'hour',
    DAY: 'day',
    MONTH: 'month',
  },

  // Event names
  EVENTS: {
    WAREHOUSE_CREATED: 'warehouse.created',
    LOCATION_CREATED: 'location.created',
    LOCATION_OCCUPIED: 'location.occupied',
    LOCATION_RELEASED: 'location.released',
    RECEIVING_ORDER_CREATED: 'receiving.order.created',
    RECEIVING_STARTED: 'receiving.started',
    RECEIVING_COMPLETED: 'receiving.completed',
    ITEM_RECEIVED: 'item.received',
    PUTAWAY_COMPLETED: 'putaway.completed',
    PICKING_ORDER_CREATED: 'picking.order.created',
    PICKING_STARTED: 'picking.started',
    PICKING_COMPLETED: 'picking.completed',
    ITEM_PICKED: 'item.picked',
    PACKING_COMPLETED: 'packing.completed',
    SHIPMENT_CREATED: 'shipment.created',
    SHIPMENT_SHIPPED: 'shipment.shipped',
    SHIPMENT_DELIVERED: 'shipment.delivered',
    CYCLE_COUNT_GENERATED: 'cycle.count.tasks.generated',
    CYCLE_COUNT_RECORDED: 'cycle.count.recorded',
    CYCLE_COUNT_RECONCILED: 'cycle.count.reconciled',
  },

  // Error codes
  ERROR_CODES: {
    INSUFFICIENT_INVENTORY: 'WMS_INSUFFICIENT_INVENTORY',
    LOCATION_NOT_AVAILABLE: 'WMS_LOCATION_NOT_AVAILABLE',
    RESOURCE_NOT_FOUND: 'WMS_RESOURCE_NOT_FOUND',
    INVALID_OPERATION_STATE: 'WMS_INVALID_OPERATION_STATE',
    QUALITY_CHECK_FAILED: 'WMS_QUALITY_CHECK_FAILED',
  },
};

