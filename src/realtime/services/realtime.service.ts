import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway } from '../gateways/websocket.gateway';
import { SseService } from './sse.service';
import { EventService } from './event.service';
import { WmsAuditLoggingService } from '../../modules/shared/wms/services/wms-audit-logging.service';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger('RealtimeService');

  constructor(
    private readonly webSocketGateway: WebSocketGateway,
    private readonly sseService: SseService,
    private readonly eventService: EventService,
    private readonly wmsAuditService: WmsAuditLoggingService,
  ) {}

  async broadcastToAll(event: string, data: any): Promise<void> {
    try {
      await this.webSocketGateway.broadcast(event, data);
      await this.sseService.broadcast(event, data);
      this.logger.log(`Broadcasted event ${event} to all clients`);
    } catch (error) {
      this.logger.error(`Error broadcasting to all: ${error.message}`);
      throw error;
    }
  }

  async broadcastToTenant(tenantId: string, event: string, data: any): Promise<void> {
    try {
      await this.webSocketGateway.broadcastToTenant(tenantId, event, data);
      await this.sseService.broadcastToTenant(tenantId, event, data);
      this.logger.log(`Broadcasted event ${event} to tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Error broadcasting to tenant: ${error.message}`);
      throw error;
    }
  }

  async broadcastToUser(userId: string, event: string, data: any): Promise<void> {
    try {
      await this.webSocketGateway.broadcastToUser(userId, event, data);
      await this.sseService.broadcastToUser(userId, event, data);
      this.logger.log(`Broadcasted event ${event} to user ${userId}`);
    } catch (error) {
      this.logger.error(`Error broadcasting to user: ${error.message}`);
      throw error;
    }
  }

  getConnectionStats(): any {
    // TODO: Implement actual connection statistics
    return {
      websocket: {
        totalConnections: 0,
        activeConnections: 0,
        connectionsByTenant: {}
      },
      sse: {
        totalConnections: 0,
        activeConnections: 0,
        connectionsByTenant: {}
      }
    };
  }

  async broadcastNotification(userId: string, notification: any): Promise<void> {
    try {
      await this.broadcastToUser(userId, 'notification', notification);
      this.logger.log(`Notification broadcasted to user ${userId}`);
    } catch (error) {
      this.logger.error(`Error broadcasting notification to user ${userId}: ${error.message}`);
      throw error;
    }
  }

  async emitEvent(event: string, data: any, tenantId?: string): Promise<void> {
    try {
      await this.eventService.emit(event, data);
      this.logger.log(`Emitted event ${event}`);
    } catch (error) {
      this.logger.error(`Error emitting event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle mobile sync operations
   */
  async handleMobileSync(params: {
    deviceId: string;
    userId: string;
    tenantId: string;
    lastSyncTime?: Date;
    operations: any[];
  }): Promise<{
    synced: boolean;
    operationsProcessed: number;
    dataUpdates: any[];
    timestamp: string;
  }> {
    try {
      this.logger.log(`Processing mobile sync for device ${params.deviceId}`);

      // Log mobile sync operation
      await this.wmsAuditService.log({
        userId: params.userId,
        action: 'MOBILE_SYNC',
        resource: 'mobile',
        method: 'POST',
        path: '/mobile/sync',
        ipAddress: 'mobile-app',
        userAgent: 'mobile-app',
        responseStatus: 200,
        metadata: {
          deviceId: params.deviceId,
          operationsCount: params.operations.length,
          lastSyncTime: params.lastSyncTime,
        },
      });

      let operationsProcessed = 0;
      const dataUpdates: any[] = [];

      // Process each operation
      for (const operation of params.operations) {
        try {
          // Here you would process the actual operation
          // For now, just log it
          operationsProcessed++;

          // Add to data updates for client
          dataUpdates.push({
            operationId: operation.id,
            status: 'processed',
            timestamp: new Date().toISOString(),
          });

        } catch (error) {
          this.logger.error(`Error processing operation ${operation.id}:`, error);
          dataUpdates.push({
            operationId: operation.id,
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Broadcast sync completion
      await this.broadcastToTenant(params.tenantId, 'mobile:sync-completed', {
        deviceId: params.deviceId,
        operationsProcessed,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to user
      await this.broadcastToUser(params.userId, 'mobile:sync-completed', {
        operationsProcessed,
        dataUpdates,
        timestamp: new Date().toISOString(),
      });

      return {
        synced: true,
        operationsProcessed,
        dataUpdates,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`Error handling mobile sync for device ${params.deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Broadcast WMS operation update
   */
  async broadcastWmsOperationUpdate(
    operationId: string,
    operationType: string,
    status: string,
    warehouseId?: string,
    metadata?: Record<string, any>,
    userId?: string,
  ): Promise<void> {
    try {
      const eventData = {
        operationId,
        operationType,
        status,
        warehouseId,
        metadata,
        updatedAt: new Date().toISOString(),
      };

      // Broadcast to relevant rooms
      await this.broadcastToAll('wms:operation-updated', eventData);

      // Log the operation update
      if (userId) {
        await this.wmsAuditService.log({
          userId,
          action: `OPERATION_${status.toUpperCase()}`,
          resource: `wms/${operationType}`,
          method: 'POST',
          path: `/wms/${operationType}/${operationId}`,
          ipAddress: 'system',
          userAgent: 'wms-system',
          responseStatus: 200,
          metadata: {
            operationId,
            operationType,
            status,
            warehouseId,
            ...metadata,
          },
        });
      }

      this.logger.log(`Broadcasted WMS operation update: ${operationType} ${operationId} -> ${status}`);

    } catch (error) {
      this.logger.error(`Error broadcasting WMS operation update:`, error);
      throw error;
    }
  }

  /**
   * Broadcast inventory alert
   */
  async broadcastInventoryAlert(
    alertType: 'low_stock' | 'overstock' | 'expired' | 'damaged' | 'recalled',
    itemCode: string,
    warehouseId: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    metadata?: Record<string, any>,
    userId?: string,
  ): Promise<void> {
    try {
      const eventData = {
        alertType,
        itemCode,
        warehouseId,
        severity,
        message,
        metadata,
        triggeredAt: new Date().toISOString(),
      };

      // Broadcast to relevant rooms
      await this.broadcastToAll('wms:inventory-alert', eventData);

      // Log the alert
      if (userId) {
        await this.wmsAuditService.log({
          userId,
          action: `INVENTORY_ALERT_${alertType.toUpperCase()}`,
          resource: 'wms/inventory',
          method: 'POST',
          path: '/wms/inventory/alert',
          ipAddress: 'system',
          userAgent: 'wms-system',
          responseStatus: 200,
          metadata: {
            alertType,
            itemCode,
            warehouseId,
            severity,
            message,
            ...metadata,
          },
        });
      }

      this.logger.log(`Broadcasted inventory alert: ${alertType} for ${itemCode} in ${warehouseId}`);

    } catch (error) {
      this.logger.error(`Error broadcasting inventory alert:`, error);
      throw error;
    }
  }
}