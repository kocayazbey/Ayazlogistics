import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(private eventEmitter: EventEmitter2) {}

  on(event: string, handler: (...args: any[]) => void) {
    this.eventEmitter.on(event, handler);
  }

  off(event: string, handler: (...args: any[]) => void) {
    this.eventEmitter.off(event, handler);
  }

  emit(event: string, data: any) {
    this.eventEmitter.emit(event, data);
    this.logger.debug(`Event emitted: ${event}`);
  }

  async emitAsync(event: string, data: any) {
    await this.eventEmitter.emitAsync(event, data);
    this.logger.debug(`Async event emitted: ${event}`);
  }

  // Inventory events
  emitInventoryCreated(inventory: any) {
    this.emit('inventory.created', { inventory, timestamp: new Date() });
  }

  emitInventoryUpdated(inventoryId: string, changes: any) {
    this.emit('inventory.updated', { inventoryId, changes, timestamp: new Date() });
  }

  emitInventoryDeleted(inventoryId: string) {
    this.emit('inventory.deleted', { inventoryId, timestamp: new Date() });
  }

  emitInventoryLowStock(inventory: any) {
    this.emit('inventory.low_stock', { inventory, timestamp: new Date() });
  }

  // Shipment events
  emitShipmentCreated(shipment: any) {
    this.emit('shipment.created', { shipment, timestamp: new Date() });
  }

  emitShipmentUpdated(shipmentId: string, changes: any) {
    this.emit('shipment.updated', { shipmentId, changes, timestamp: new Date() });
  }

  emitShipmentStatusChanged(shipmentId: string, oldStatus: string, newStatus: string) {
    this.emit('shipment.status_changed', { 
      shipmentId, 
      oldStatus, 
      newStatus, 
      timestamp: new Date() 
    });
  }

  // Vehicle events
  emitVehicleLocationUpdated(vehicleId: string, location: any) {
    this.emit('vehicle.location_updated', { vehicleId, location, timestamp: new Date() });
  }

  emitVehicleStatusChanged(vehicleId: string, oldStatus: string, newStatus: string) {
    this.emit('vehicle.status_changed', { 
      vehicleId, 
      oldStatus, 
      newStatus, 
      timestamp: new Date() 
    });
  }

  // Route events
  emitRouteCreated(route: any) {
    this.emit('route.created', { route, timestamp: new Date() });
  }

  emitRouteAssigned(routeId: string, driverId: string) {
    this.emit('route.assigned', { routeId, driverId, timestamp: new Date() });
  }

  emitRouteCompleted(routeId: string) {
    this.emit('route.completed', { routeId, timestamp: new Date() });
  }

  // User events
  emitUserLoggedIn(userId: string, loginData: any) {
    this.emit('user.logged_in', { userId, loginData, timestamp: new Date() });
  }

  emitUserLoggedOut(userId: string) {
    this.emit('user.logged_out', { userId, timestamp: new Date() });
  }

  // System events
  emitSystemError(error: any) {
    this.emit('system.error', { error, timestamp: new Date() });
  }

  emitSystemMaintenance(maintenance: any) {
    this.emit('system.maintenance', { maintenance, timestamp: new Date() });
  }

  // Custom events
  emitCustomEvent(eventName: string, data: any) {
    this.emit(eventName, { data, timestamp: new Date() });
  }
}