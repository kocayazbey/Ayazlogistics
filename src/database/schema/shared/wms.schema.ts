import { pgTable, text, timestamp, uuid, integer, decimal, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Warehouse Management
export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  postalCode: text('postal_code'),
  phone: text('phone'),
  email: text('email'),
  manager: text('manager'),
  capacity: integer('capacity'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Receiving
export const receivingOrders = pgTable('receiving_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  receivingNumber: text('receiving_number').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  supplier: text('supplier'),
  expectedDate: timestamp('expected_date'),
  receivedDate: timestamp('received_date'),
  status: text('status').default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Picking
export const pickingOrders = pgTable('picking_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  pickingNumber: text('picking_number').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  orderId: uuid('order_id'),
  pickerId: uuid('picker_id'),
  status: text('status').default('pending'),
  priority: text('priority').default('normal'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Packing
export const packingOrders = pgTable('packing_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  packingNumber: text('packing_number').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  orderId: uuid('order_id'),
  packerId: uuid('packer_id'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Shipping
export const shipments = pgTable('shipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  shipmentNumber: text('shipment_number').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  orderId: uuid('order_id'),
  customer: text('customer'),
  status: text('status').default('pending'),
  priority: text('priority').default('normal'),
  driverId: uuid('driver_id'),
  vehicleId: uuid('vehicle_id'),
  totalValue: decimal('total_value', { precision: 15, scale: 2 }),
  destination: text('destination'),
  carrier: text('carrier'),
  trackingNumber: text('tracking_number'),
  expectedDelivery: timestamp('expected_delivery'),
  dispatchedAt: timestamp('dispatched_at'),
  shippedAt: timestamp('shipped_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantNumberIdx: index('idx_shipments_tenant_number').on(table.tenantId, table.shipmentNumber),
  trackingNumberIdx: index('idx_shipments_tracking_number').on(table.trackingNumber).where(table.trackingNumber.isNotNull()),
  statusDatesIdx: index('idx_shipments_status_dates').on(table.status, table.createdAt.desc()),
  driverDatesIdx: index('idx_shipments_driver_dates').on(table.driverId, table.createdAt.desc()).where(table.driverId.isNotNull()),
  warehouseStatusIdx: index('idx_shipments_warehouse_status').on(table.warehouseId, table.status),
  customerStatusIdx: index('idx_shipments_customer_status').on(table.tenantId, table.status, table.createdAt.desc()),
  inTransitIdx: index('idx_shipments_in_transit').on(table.tenantId, table.status, table.updatedAt.desc()).where(table.status.eq('in_transit')),
}));

// Inventory
export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  locationId: uuid('location_id'),
  zoneId: uuid('zone_id'),
  productId: uuid('product_id').notNull(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  quantityOnHand: integer('quantity_on_hand').default(0),
  quantityReserved: integer('quantity_reserved').default(0),
  quantityAvailable: integer('quantity_available').default(0),
  minQuantity: integer('min_quantity').default(0),
  maxQuantity: integer('max_quantity'),
  unitCost: decimal('unit_cost', { precision: 15, scale: 2 }),
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }),
  minStockLevel: integer('min_stock_level').default(0),
  maxStockLevel: integer('max_stock_level'),
  reorderPoint: integer('reorder_point').default(0),
  reorderQuantity: integer('reorder_quantity'),
  lotNumber: text('lot_number'),
  serialNumber: text('serial_number'),
  expiryDate: timestamp('expiry_date'),
  status: text('status').default('active'),
  lastMovementDate: timestamp('last_movement_date'),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantSkuIdx: index('idx_inventory_tenant_sku').on(table.tenantId, table.sku),
  warehouseStatusIdx: index('idx_inventory_warehouse_status').on(table.warehouseId, table.status),
  productLocationIdx: index('idx_inventory_product_location').on(table.productId, table.locationId),
  quantityStatusIdx: index('idx_inventory_quantity_status').on(table.tenantId, table.quantityAvailable, table.status).where(table.status.eq('active')),
  categoryIdx: index('idx_inventory_category').on(table.tenantId, table.category),
  activeIdx: index('idx_inventory_active').on(table.tenantId, table.warehouseId, table.updatedAt.desc()).where(table.status.eq('active')),
  lowStockIdx: index('idx_inventory_low_stock').on(table.tenantId, table.quantityAvailable).where(table.quantityAvailable.lte(table.minStockLevel)),
}));

// Inventory Movements
export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  inventoryId: uuid('inventory_id').notNull(),
  movementType: text('movement_type').notNull(), // in, out, transfer, adjustment
  quantity: integer('quantity').notNull(),
  unitCost: decimal('unit_cost', { precision: 15, scale: 2 }),
  reason: text('reason'),
  reference: text('reference'), // PO number, SO number, etc.
  userId: uuid('user_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Cycle Counting
export const cycleCounts = pgTable('cycle_counts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  countNumber: text('count_number').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  locationId: uuid('location_id'),
  itemId: uuid('item_id'),
  expectedQuantity: integer('expected_quantity'),
  actualQuantity: integer('actual_quantity'),
  variance: integer('variance'),
  status: text('status').default('pending'),
  countedAt: timestamp('counted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Replenishment
export const replenishments = pgTable('replenishments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  replenishmentNumber: text('replenishment_number').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  itemId: uuid('item_id'),
  fromLocation: text('from_location'),
  toLocation: text('to_location'),
  quantity: integer('quantity'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Slotting
export const slottingAnalysis = pgTable('slotting_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  analysisNumber: text('analysis_number').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  itemId: uuid('item_id'),
  currentLocation: text('current_location'),
  recommendedLocation: text('recommended_location'),
  reason: text('reason'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Wave Picking
export const waves = pgTable('waves', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  waveNumber: text('wave_number').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  status: text('status').default('pending'),
  releasedAt: timestamp('released_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Voice Picking
export const voiceSessions = pgTable('voice_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  sessionId: text('session_id').notNull(),
  userId: uuid('user_id'),
  warehouseId: uuid('warehouse_id'),
  status: text('status').default('active'),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// RFID Integration
export const rfidTags = pgTable('rfid_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  tagId: text('tag_id').notNull(),
  itemId: uuid('item_id'),
  locationId: uuid('location_id'),
  status: text('status').default('active'),
  lastScannedAt: timestamp('last_scanned_at'),
  scanHistory: jsonb('scan_history'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Location Management
export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  code: text('code').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  zoneId: uuid('zone_id'),
  zone: text('zone'),
  aisle: text('aisle'),
  rack: text('rack'),
  shelf: text('shelf'),
  bin: text('bin'),
  locationType: text('location_type'),
  isOccupied: boolean('is_occupied').default(false),
  itemId: uuid('item_id'),
  occupiedAt: timestamp('occupied_at'),
  releasedAt: timestamp('released_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Batch/Lot Tracking
export const batchLots = pgTable('batch_lots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  batchNumber: text('batch_number').notNull(),
  lotNumber: text('lot_number').notNull(),
  itemId: uuid('item_id'),
  currentLocation: text('current_location'),
  status: text('status').default('active'),
  expiryDate: timestamp('expiry_date'),
  lastMovedAt: timestamp('last_moved_at'),
  movementHistory: jsonb('movement_history'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Cartonization
export const cartonizations = pgTable('cartonizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  cartonizationNumber: text('cartonization_number').notNull(),
  orderId: uuid('order_id'),
  cartonId: uuid('carton_id'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Consolidation
export const consolidations = pgTable('consolidations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  consolidationNumber: text('consolidation_number').notNull(),
  orderId: uuid('order_id'),
  shipmentId: uuid('shipment_id'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Cross Docking
export const crossDocks = pgTable('cross_docks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  crossDockNumber: text('cross_dock_number').notNull(),
  inboundShipmentId: uuid('inbound_shipment_id'),
  outboundShipmentId: uuid('outbound_shipment_id'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Kitting
export const kittings = pgTable('kittings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  kittingNumber: text('kitting_number').notNull(),
  orderId: uuid('order_id'),
  status: text('status').default('pending'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Pallet Management
export const pallets = pgTable('pallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  palletNumber: text('pallet_number').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  locationId: uuid('location_id'),
  orderId: uuid('order_id'),
  status: text('status').default('available'),
  assignedAt: timestamp('assigned_at'),
  releasedAt: timestamp('released_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Label Printing
export const labels = pgTable('labels', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  labelNumber: text('label_number').notNull(),
  type: text('type').notNull(),
  itemId: uuid('item_id'),
  orderId: uuid('order_id'),
  status: text('status').default('pending'),
  printedAt: timestamp('printed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// AGV Fleet
export const agvFleet = pgTable('agv_fleet', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  agvNumber: text('agv_number').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  currentTaskId: uuid('current_task_id'),
  status: text('status').default('available'),
  assignedAt: timestamp('assigned_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// IoT Sensors
export const iotSensors = pgTable('iot_sensors', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  sensorId: text('sensor_id').notNull(),
  warehouseId: uuid('warehouse_id'),
  locationId: uuid('location_id'),
  type: text('type').notNull(),
  status: text('status').default('active'),
  lastReading: jsonb('last_reading'),
  lastReadingAt: timestamp('last_reading_at'),
  readingHistory: jsonb('reading_history'),
  alerts: jsonb('alerts'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Quality Control
export const qualityControls = pgTable('quality_controls', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  controlNumber: text('control_number').notNull(),
  itemId: uuid('item_id'),
  inspectorId: uuid('inspector_id'),
  type: text('type').notNull(),
  status: text('status').default('pending'),
  passed: boolean('passed'),
  results: jsonb('results'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Products
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  supplier: text('supplier'),
  unitCost: decimal('unit_cost', { precision: 15, scale: 2 }),
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  dimensions: jsonb('dimensions'), // {length, width, height}
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Receipts
export const receipts = pgTable('receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  receiptNumber: text('receipt_number').notNull(),
  supplier: text('supplier'),
  status: text('status').default('pending'),
  totalValue: decimal('total_value', { precision: 15, scale: 2 }),
  receivedAt: timestamp('received_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Receipt Items
export const receiptItems = pgTable('receipt_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  receiptId: uuid('receipt_id').notNull(),
  productId: uuid('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unitCost: decimal('unit_cost', { precision: 15, scale: 2 }),
  locationId: uuid('location_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Picks
export const picks = pgTable('picks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  pickNumber: text('pick_number').notNull(),
  orderId: uuid('order_id'),
  customer: text('customer'),
  status: text('status').default('pending'),
  priority: text('priority').default('normal'),
  assignedTo: uuid('assigned_to'),
  totalValue: decimal('total_value', { precision: 15, scale: 2 }),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Pick Items
export const pickItems = pgTable('pick_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  pickId: uuid('pick_id').notNull(),
  productId: uuid('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  location: text('location'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Shipment Items
export const shipmentItems = pgTable('shipment_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  shipmentId: uuid('shipment_id').notNull(),
  productId: uuid('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  dimensions: jsonb('dimensions'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Zones
export const zones = pgTable('zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  description: text('description'),
  capacity: integer('capacity'),
  temperature: decimal('temperature', { precision: 5, scale: 2 }),
  humidity: decimal('humidity', { precision: 5, scale: 2 }),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Operations
export const operations = pgTable('operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  type: text('type').notNull(), // receiving, picking, packing, shipping
  status: text('status').default('pending'),
  duration: integer('duration'), // in minutes
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const warehouseRelations = relations(warehouses, ({ many }) => ({
  receivingOrders: many(receivingOrders),
  pickingOrders: many(pickingOrders),
  packingOrders: many(packingOrders),
  shipments: many(shipments),
  cycleCounts: many(cycleCounts),
  replenishments: many(replenishments),
  slottingAnalysis: many(slottingAnalysis),
  waves: many(waves),
  voiceSessions: many(voiceSessions),
  rfidTags: many(rfidTags),
  locations: many(locations),
  pallets: many(pallets),
  agvFleet: many(agvFleet),
  iotSensors: many(iotSensors),
}));

export const receivingOrderRelations = relations(receivingOrders, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [receivingOrders.warehouseId],
    references: [warehouses.id],
  }),
}));

export const pickingOrderRelations = relations(pickingOrders, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [pickingOrders.warehouseId],
    references: [warehouses.id],
  }),
}));

export const packingOrderRelations = relations(packingOrders, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [packingOrders.warehouseId],
    references: [warehouses.id],
  }),
}));

export const shipmentRelations = relations(shipments, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [shipments.warehouseId],
    references: [warehouses.id],
  }),
}));

export const cycleCountRelations = relations(cycleCounts, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [cycleCounts.warehouseId],
    references: [warehouses.id],
  }),
}));

export const replenishmentRelations = relations(replenishments, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [replenishments.warehouseId],
    references: [warehouses.id],
  }),
}));

export const slottingAnalysisRelations = relations(slottingAnalysis, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [slottingAnalysis.warehouseId],
    references: [warehouses.id],
  }),
}));

export const waveRelations = relations(waves, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [waves.warehouseId],
    references: [warehouses.id],
  }),
}));

export const voiceSessionRelations = relations(voiceSessions, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [voiceSessions.warehouseId],
    references: [warehouses.id],
  }),
}));

export const rfidTagRelations = relations(rfidTags, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [rfidTags.warehouseId],
    references: [warehouses.id],
  }),
}));

export const locationRelations = relations(locations, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [locations.warehouseId],
    references: [warehouses.id],
  }),
}));

export const batchLotRelations = relations(batchLots, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [batchLots.warehouseId],
    references: [warehouses.id],
  }),
}));

export const cartonizationRelations = relations(cartonizations, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [cartonizations.warehouseId],
    references: [warehouses.id],
  }),
}));

export const consolidationRelations = relations(consolidations, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [consolidations.warehouseId],
    references: [warehouses.id],
  }),
}));

export const crossDockRelations = relations(crossDocks, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [crossDocks.warehouseId],
    references: [warehouses.id],
  }),
}));

export const kittingRelations = relations(kittings, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [kittings.warehouseId],
    references: [warehouses.id],
  }),
}));

export const palletRelations = relations(pallets, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [pallets.warehouseId],
    references: [warehouses.id],
  }),
}));

export const labelRelations = relations(labels, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [labels.warehouseId],
    references: [warehouses.id],
  }),
}));

export const agvFleetRelations = relations(agvFleet, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [agvFleet.warehouseId],
    references: [warehouses.id],
  }),
}));

export const iotSensorRelations = relations(iotSensors, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [iotSensors.warehouseId],
    references: [warehouses.id],
  }),
}));

export const qualityControlRelations = relations(qualityControls, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [qualityControls.warehouseId],
    references: [warehouses.id],
  }),
}));

// Product Relations
export const productRelations = relations(products, ({ many }) => ({
  inventory: many(inventory),
  receiptItems: many(receiptItems),
  pickItems: many(pickItems),
  shipmentItems: many(shipmentItems),
}));

// Receipt Relations
export const receiptRelations = relations(receipts, ({ many }) => ({
  items: many(receiptItems),
}));

export const receiptItemRelations = relations(receiptItems, ({ one }) => ({
  receipt: one(receipts, {
    fields: [receiptItems.receiptId],
    references: [receipts.id],
  }),
  product: one(products, {
    fields: [receiptItems.productId],
    references: [products.id],
  }),
}));

// Pick Relations
export const pickRelations = relations(picks, ({ many }) => ({
  items: many(pickItems),
}));

export const pickItemRelations = relations(pickItems, ({ one }) => ({
  pick: one(picks, {
    fields: [pickItems.pickId],
    references: [picks.id],
  }),
  product: one(products, {
    fields: [pickItems.productId],
    references: [products.id],
  }),
}));

// Shipment Item Relations
export const shipmentItemRelations = relations(shipmentItems, ({ one }) => ({
  shipment: one(shipments, {
    fields: [shipmentItems.shipmentId],
    references: [shipments.id],
  }),
  product: one(products, {
    fields: [shipmentItems.productId],
    references: [products.id],
  }),
}));

// Zone Relations
export const zoneRelations = relations(zones, ({ many }) => ({
  inventory: many(inventory),
}));