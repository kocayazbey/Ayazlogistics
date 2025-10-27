import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WMSWebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class RealtimeEventsService {
  private readonly logger = new Logger(RealtimeEventsService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly wsGateway: WMSWebSocketGateway,
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Inventory events
    this.eventEmitter.on('inventory.created', (data) => {
      this.broadcastInventoryUpdate(data.warehouseId, {
        type: 'inventory.created',
        data,
        timestamp: new Date(),
      });
    });

    this.eventEmitter.on('inventory.updated', (data) => {
      this.broadcastInventoryUpdate(data.warehouseId, {
        type: 'inventory.updated',
        data,
        timestamp: new Date(),
      });
    });

    this.eventEmitter.on('inventory.low_stock', (data) => {
      this.broadcastInventoryUpdate(data.warehouseId, {
        type: 'inventory.low_stock',
        data,
        timestamp: new Date(),
      });
    });

    // Operation events
    this.eventEmitter.on('operation.created', (data) => {
      this.broadcastOperationUpdate(data.warehouseId, {
        type: 'operation.created',
        data,
        timestamp: new Date(),
      });
    });

    this.eventEmitter.on('operation.started', (data) => {
      this.broadcastOperationUpdate(data.warehouseId, {
        type: 'operation.started',
        data,
        timestamp: new Date(),
      });
    });

    this.eventEmitter.on('operation.completed', (data) => {
      this.broadcastOperationUpdate(data.warehouseId, {
        type: 'operation.completed',
        data,
        timestamp: new Date(),
      });
    });

    // Picking events
    this.eventEmitter.on('picking.started', (data) => {
      this.broadcastOperationUpdate(data.warehouseId, {
        type: 'picking.started',
        data,
        timestamp: new Date(),
      });
    });

    this.eventEmitter.on('picking.completed', (data) => {
      this.broadcastOperationUpdate(data.warehouseId, {
        type: 'picking.completed',
        data,
        timestamp: new Date(),
      });
    });

    // Shipping events
    this.eventEmitter.on('shipment.created', (data) => {
      this.broadcastTrackingUpdate(data.shipmentId, {
        type: 'shipment.created',
        data,
        timestamp: new Date(),
      });
    });

    this.eventEmitter.on('shipment.dispatched', (data) => {
      this.broadcastTrackingUpdate(data.shipmentId, {
        type: 'shipment.dispatched',
        data,
        timestamp: new Date(),
      });
    });

    this.eventEmitter.on('shipment.delivered', (data) => {
      this.broadcastTrackingUpdate(data.shipmentId, {
        type: 'shipment.delivered',
        data,
        timestamp: new Date(),
      });
    });

    // Alert events
    this.eventEmitter.on('alert.created', (data) => {
      this.broadcastAlert(data.tenantId, {
        type: 'alert',
        level: data.level,
        message: data.message,
        data,
        timestamp: new Date(),
      });
    });

    this.logger.log('Realtime event listeners setup complete');
  }

  private broadcastInventoryUpdate(warehouseId: string, data: any) {
    if (warehouseId) {
      this.wsGateway.broadcastInventoryUpdate(warehouseId, data);
      this.logger.debug(`Inventory update broadcasted to warehouse: ${warehouseId}`);
    }
  }

  private broadcastOperationUpdate(warehouseId: string, data: any) {
    if (warehouseId) {
      this.wsGateway.broadcastOperationUpdate(warehouseId, data);
      this.logger.debug(`Operation update broadcasted to warehouse: ${warehouseId}`);
    }
  }

  private broadcastTrackingUpdate(shipmentId: string, data: any) {
    if (shipmentId) {
      this.wsGateway.broadcastTrackingUpdate(shipmentId, data);
      this.logger.debug(`Tracking update broadcasted for shipment: ${shipmentId}`);
    }
  }

  private broadcastAlert(tenantId: string, alert: any) {
    if (tenantId) {
      this.wsGateway.broadcastAlert(tenantId, alert);
      this.logger.debug(`Alert broadcasted to tenant: ${tenantId}`);
    }
  }

  // Manual broadcast methods
  broadcastToWarehouse(warehouseId: string, event: string, data: any) {
    this.wsGateway.server.to(`warehouse:${warehouseId}`).emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }

  broadcastToTenant(tenantId: string, event: string, data: any) {
    this.wsGateway.server.to(`tenant:${tenantId}`).emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }

  broadcastToUser(userId: string, event: string, data: any) {
    this.wsGateway.server.emit(event, {
      ...data,
      userId,
      timestamp: new Date(),
    });
  }

  getConnectedClientsCount(): number {
    return this.wsGateway.getConnectedClientsCount();
  }

  getClientsByWarehouse(warehouseId: string) {
    return this.wsGateway.getClientsByWarehouse(warehouseId);
  }
}
