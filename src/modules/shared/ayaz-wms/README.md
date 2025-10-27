# AyazWMS - Warehouse Management System Module

## 📋 Overview

AyazWMS is a comprehensive, enterprise-grade Warehouse Management System module designed for modern logistics operations. It provides complete warehouse operations management including receiving, putaway, picking, packing, shipping, and inventory control.

## 🎯 Key Features

### Core Operations
- ✅ **Receiving** - Advanced goods receipt with ASN, quality checks, and automated putaway suggestions
- ✅ **Putaway** - Intelligent location optimization with ABC analysis and slotting
- ✅ **Picking** - Multiple strategies (FIFO, LIFO, FEFO, Zone, Batch) with wave and voice picking
- ✅ **Packing** - Cartonization optimization and packing validation
- ✅ **Shipping** - Multi-carrier integration, label generation, and tracking
- ✅ **Cycle Counting** - ABC/Random/Zone strategies with variance reconciliation

### Advanced Features
- ✅ **Slotting Optimization** - Velocity-based location optimization
- ✅ **Wave Picking** - Batch wave generation and consolidation
- ✅ **Voice Picking** - Multi-language voice-directed picking
- ✅ **RFID Integration** - Tag reading and inventory reconciliation
- ✅ **AGV Fleet Management** - Automated guided vehicle coordination
- ✅ **Quality Control** - Inspection management and defect tracking
- ✅ **Batch/Lot Tracking** - Complete traceability with FIFO/FEFO allocation
- ✅ **Cross-Docking** - Direct transfer without storage
- ✅ **Kitting** - Assembly and component management
- ✅ **Replenishment** - Automated min/max replenishment
- ✅ **IoT Sensors** - Real-time environmental monitoring

### Business Intelligence
- ✅ **WMS Analytics** - Comprehensive performance metrics
- ✅ **Stock Cards** - ERP integration for stock management
- ✅ **Inventory Query** - Advanced search and filtering
- ✅ **Billing Integration** - Automatic usage tracking for 4 billing models

## 🏗️ Architecture

```
ayaz-wms/
├── warehouse-management/      # Warehouse and location management
├── receiving/                 # Goods receipt operations
├── putaway/                  # Put-to-location operations
├── picking/                  # Order picking operations
├── packing/                  # Packing and cartonization
├── shipping/                 # Shipment and carrier management
├── cycle-counting/           # Inventory cycle counts
├── replenishment/            # Stock replenishment
├── slotting/                 # Location optimization
├── wave-picking/             # Batch wave picking
├── voice-picking/            # Voice-directed operations
├── rfid-integration/         # RFID tag management
├── agv-fleet/                # Automated vehicle management
├── quality-control/          # QC and inspections
├── batch-lot-tracking/       # Lot traceability
├── cartonization/            # Box optimization
├── consolidation/            # Shipment consolidation
├── cross-docking/            # Cross-dock operations
├── kitting/                  # Kit assembly
├── pallet-management/        # Pallet operations
├── label-printing/           # Label generation
├── iot-sensors/              # IoT sensor management
├── stock-cards/              # Stock card management
├── inventory-query/          # Inventory search
├── analytics/                # WMS analytics
├── billing-integration/      # Billing event listeners
├── mobile-screens/           # Mobile app configurations
└── web-screens/              # Web UI configurations
```

## 🚀 Usage

### Basic Example

```typescript
import { WMSModule } from './modules/shared/wms/wms.module';

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
    CacheModule,
    WebSocketModule,
    WMSModule,
  ],
})
export class AppModule {}
```

### Receiving Workflow

```typescript
// 1. Create receiving order
const receivingOrder = await receivingService.createReceivingOrder({
  warehouseId: 'WH-001',
  poNumber: 'PO-12345',
  supplier: 'ABC Suppliers',
  expectedDate: new Date('2025-10-25'),
  lineItems: [
    { productId: 'PROD-001', expectedQuantity: 100 },
  ],
}, tenantId, userId);

// 2. Start receiving
await receivingService.startReceiving(receivingOrder.id, userId);

// 3. Receive items
await receivingService.receiveItem({
  receivingOrderId: receivingOrder.id,
  productId: 'PROD-001',
  quantity: 100,
  condition: 'good',
  locationId: 'LOC-A1-01',
}, warehouseId, tenantId, userId);

// 4. Complete receiving
await receivingService.completeReceiving(receivingOrder.id, warehouseId);
```

### Picking Workflow

```typescript
// 1. Create picking order
const pickingOrder = await pickingService.createPickingOrder({
  warehouseId: 'WH-001',
  orderNumber: 'ORD-12345',
  pickingStrategy: 'FIFO',
  pickingType: 'single',
  priority: 'high',
  lineItems: [
    { productId: 'PROD-001', quantity: 50 },
  ],
}, userId);

// 2. Start picking
await pickingService.startPicking(pickingOrder.id, userId);

// 3. Pick items
for (const task of pickingOrder.tasks) {
  await pickingService.pickItem({
    pickingOrderId: pickingOrder.id,
    taskId: task.id,
    productId: task.productId,
    locationId: task.locationId,
    quantityPicked: task.quantity,
  }, warehouseId, userId);
}

// 4. Complete picking
await pickingService.completePicking(pickingOrder.id, warehouseId);
```

## 💰 Billing Integration

AyazWMS automatically tracks all operations for billing:

### Billing Models

1. **Handling Billing** - Per movement (receiving, putaway, picking, packing, shipping)
2. **Rack Storage** - Per pallet position per day
3. **Forklift + Operator** - Per hour
4. **Waiting Time** - Per hour

### Auto-Tracking

All WMS operations emit events that are automatically captured for billing:

```typescript
// Automatically tracked operations:
- item.received → Handling billing
- putaway.completed → Handling billing
- item.picked → Handling billing  
- packing.completed → Handling billing
- shipment.shipped → Handling billing
- location.occupied → Daily rack storage billing
- agv.task.completed → Equipment billing
```

## 📊 Analytics & Reporting

### Available Reports

```typescript
// Performance Metrics
const performance = await analyticsService.getWarehousePerformance(warehouseId, period);
// Returns: receiving metrics, picking metrics, shipping metrics, inventory metrics

// Cost Analysis
const costs = await analyticsService.getOperationalCosts(warehouseId, period, contractId);
// Returns: costs by type, breakdown, total

// Productivity
const productivity = await analyticsService.getProductivityMetrics(warehouseId, period);
// Returns: lines per hour, utilization rates

// ABC Analysis
const abc = await inventoryQueryService.getInventoryABCAnalysis(warehouseId);
// Returns: A/B/C classification with value analysis
```

## 🎮 Mobile & Web Support

### Mobile Screens
- Receiving screen configuration
- Picking screen configuration
- Putaway screen configuration
- Cycle count screen configuration
- Shipping screen configuration

### Web Dashboards
- Real-time operations dashboard
- Inventory management screen
- Analytics and reports
- Settings and configuration

## 🔧 Configuration

```typescript
import { defaultWmsConfig } from './config/wms.config';

// Customize WMS behavior
const customConfig = {
  ...defaultWmsConfig,
  operations: {
    defaultPickingStrategy: 'FEFO',
    autoAllocateInventory: true,
    enableBatchPicking: true,
  },
  features: {
    voicePicking: true,
    rfid: true,
    agv: true,
  },
};
```

## 🧪 Testing

```bash
# Run WMS tests
npm test -- ayaz-wms

# Run with coverage
npm test -- --coverage ayaz-wms

# Run integration tests
npm test -- wms.integration.spec.ts
```

## 📈 Performance

- **API Response Time**: < 100ms (p95)
- **Concurrent Operations**: 100+
- **Cache Hit Rate**: > 80%
- **Real-time Updates**: WebSocket enabled
- **Multi-tenant**: Full isolation

## 🔐 Security

- JWT authentication required
- Role-based access control (RBAC)
- Tenant isolation on all queries
- Audit logging for all operations
- Data encryption at rest

## 🌍 Supported Languages

- English (en-US)
- Turkish (tr-TR)
- Spanish (es-ES)

## 📞 Events

All operations emit events for integration:

```typescript
// Subscribe to WMS events
@OnEvent('item.received')
async handleItemReceived(event) {
  // Your custom logic
}
```

### Available Events

- `warehouse.created`, `warehouse.updated`
- `location.created`, `location.occupied`, `location.released`
- `receiving.order.created`, `receiving.started`, `receiving.completed`
- `item.received`, `putaway.completed`
- `picking.order.created`, `picking.started`, `picking.completed`
- `item.picked`, `packing.completed`
- `shipment.created`, `shipment.shipped`, `shipment.delivered`
- `cycle.count.generated`, `cycle.count.recorded`, `cycle.count.reconciled`
- `slotting.analysis.completed`, `slotting.executed`
- `wave.created`, `wave.released`
- `replenishment.analysis.completed`

## 🔌 Integration Points

### ERP Integration
- Stock movements sync
- Financial transactions
- GL account integration

### Billing System
- Automatic usage tracking
- Invoice line item generation
- Contract-based pricing

### External Systems
- Carrier APIs (label generation, tracking)
- RFID readers
- AGV fleet controllers
- IoT sensor platforms
- Voice recognition systems

## 📚 API Endpoints

### Warehouses
- `GET /v1/wms/warehouses` - List warehouses
- `POST /v1/wms/warehouses` - Create warehouse
- `GET /v1/wms/warehouses/:id/locations` - Get locations
- `POST /v1/wms/warehouses/:id/locations` - Create location

### Receiving
- `GET /v1/wms/receiving` - List receiving orders
- `POST /v1/wms/receiving` - Create receiving order

### Picking
- `GET /v1/wms/picking` - List picking orders
- `POST /v1/wms/picking` - Create picking order

### Shipping
- `GET /v1/wms/shipments` - List shipments
- `POST /v1/wms/shipments` - Create shipment

### Inventory
- `GET /v1/wms/inventory` - Query inventory
- `POST /v1/wms/inventory/adjust` - Adjust inventory
- `GET /v1/wms/inventory/search` - Search inventory
- `GET /v1/wms/inventory/abc-analysis` - ABC analysis
- `GET /v1/wms/inventory/low-stock` - Low stock items
- `GET /v1/wms/inventory/expiring` - Expiring items

### Analytics
- `GET /v1/wms/analytics/performance` - Performance metrics
- `GET /v1/wms/analytics/costs` - Cost analysis
- `GET /v1/wms/analytics/productivity` - Productivity metrics

### Stock Cards
- `GET /v1/wms/stock-cards` - Search stock cards
- `POST /v1/wms/stock-cards` - Create stock card
- `GET /v1/wms/stock-cards/:id` - Get stock card
- `PUT /v1/wms/stock-cards/:id` - Update stock card
- `POST /v1/wms/stock-cards/:id/adjust` - Adjust stock

### Cycle Counting
- `POST /v1/wms/cycle-count` - Create cycle count

### Slotting
- `GET /v1/wms/slotting/analysis` - Analyze optimization
- `POST /v1/wms/slotting/execute` - Execute slotting change

### Wave Picking
- `POST /v1/wms/wave` - Create wave
- `POST /v1/wms/wave/:waveId/release` - Release wave

### Replenishment
- `GET /v1/wms/replenishment/analyze` - Analyze needs
- `POST /v1/wms/replenishment/wave` - Create wave
- `POST /v1/wms/replenishment/schedule` - Schedule auto-replenishment

## 🏆 Best Practices

1. Always use proper picking strategy based on product type (FEFO for perishables)
2. Enable quality checks for high-value items
3. Run cycle counts regularly (weekly ABC recommended)
4. Monitor slotting optimization quarterly
5. Use wave picking for high-volume operations
6. Enable automatic billing tracking
7. Review analytics dashboards daily

## 📝 License

Proprietary - AyazLogistics

## 👥 Maintainers

- AyazLogistics Development Team
- Email: dev@ayazlogistics.com

