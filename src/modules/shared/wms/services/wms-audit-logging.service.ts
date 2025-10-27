import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditLoggingService, AuditLog } from '../../../../common/services/audit-logging.service';

export interface WmsAuditLog extends AuditLog {
  operationType?: string;
  warehouseId?: string;
  locationId?: string;
  itemCode?: string;
  quantity?: number;
  batchNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  operatorId?: string;
  equipmentId?: string;
  workOrderId?: string;
  shipmentId?: string;
  pickingOrderId?: string;
  receivingOrderId?: string;
}

export interface WmsOperationContext {
  operationType: 'RECEIVING' | 'PICKING' | 'SHIPPING' | 'INVENTORY_ADJUSTMENT' | 'CYCLE_COUNT' | 'PUTAWAY' | 'REPLENISHMENT' | 'WAREHOUSE_TRANSFER';
  warehouseId?: string;
  locationId?: string;
  itemCode?: string;
  quantity?: number;
  batchNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  operatorId?: string;
  equipmentId?: string;
  workOrderId?: string;
  shipmentId?: string;
  pickingOrderId?: string;
  receivingOrderId?: string;
  additionalData?: Record<string, any>;
}

@Injectable()
export class WmsAuditLoggingService {
  private readonly logger = new Logger(WmsAuditLoggingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly auditLoggingService: AuditLoggingService
  ) {}

  async log(logData: Partial<WmsAuditLog>): Promise<void> {
    try {
      const auditLog: WmsAuditLog = {
        id: `wms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        userId: logData.userId || 'system',
        action: logData.action || 'UNKNOWN',
        resource: logData.resource || 'wms',
        details: logData.details || {},
        ipAddress: logData.ipAddress || 'unknown',
        userAgent: logData.userAgent || 'system',
        ...logData
      };

      await this.auditLoggingService.log(auditLog);
      this.logger.log(`WMS audit log created: ${auditLog.action} by ${auditLog.userId}`);
    } catch (error) {
      this.logger.error('Error creating WMS audit log', error);
    }
  }

  /**
   * Log WMS specific operation
   */
  async logWmsOperation(
    userId: string,
    action: string,
    resource: string,
    context: WmsOperationContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    const wmsMetadata = {
      operationType: context.operationType,
      warehouseId: context.warehouseId,
      locationId: context.locationId,
      itemCode: context.itemCode,
      quantity: context.quantity,
      batchNumber: context.batchNumber,
      lotNumber: context.lotNumber,
      serialNumber: context.serialNumber,
      operatorId: context.operatorId,
      equipmentId: context.equipmentId,
      workOrderId: context.workOrderId,
      shipmentId: context.shipmentId,
      pickingOrderId: context.pickingOrderId,
      receivingOrderId: context.receivingOrderId,
      ...metadata,
      ...context.additionalData,
    };

    await this.auditLoggingService.log({
      userId,
      action: `WMS_${action}`,
      resource: `wms/${resource}`,
      method: this.getMethodFromAction(action),
      path: this.getPathFromContext(context),
      ipAddress: '0.0.0.0', // Will be filled by interceptor
      userAgent: 'wms-system',
      responseStatus: 200,
      metadata: wmsMetadata,
    });

    this.logger.debug(`WMS Operation logged: ${action} on ${resource} by user ${userId}`);
  }

  /**
   * Log receiving operation
   */
  async logReceivingOperation(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'COMPLETE' | 'CANCEL',
    receivingOrderId: string,
    context: Omit<WmsOperationContext, 'operationType' | 'receivingOrderId'>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logWmsOperation(
      userId,
      `RECEIVING_${action}`,
      'receiving',
      { ...context, operationType: 'RECEIVING', receivingOrderId },
      metadata
    );
  }

  /**
   * Log picking operation
   */
  async logPickingOperation(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'COMPLETE' | 'CANCEL' | 'START' | 'PAUSE' | 'RESUME',
    pickingOrderId: string,
    context: Omit<WmsOperationContext, 'operationType' | 'pickingOrderId'>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logWmsOperation(
      userId,
      `PICKING_${action}`,
      'picking',
      { ...context, operationType: 'PICKING', pickingOrderId },
      metadata
    );
  }

  /**
   * Log shipping operation
   */
  async logShippingOperation(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'SHIP' | 'CANCEL' | 'LOAD' | 'UNLOAD',
    shipmentId: string,
    context: Omit<WmsOperationContext, 'operationType' | 'shipmentId'>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logWmsOperation(
      userId,
      `SHIPPING_${action}`,
      'shipping',
      { ...context, operationType: 'SHIPPING', shipmentId },
      metadata
    );
  }

  /**
   * Log inventory adjustment
   */
  async logInventoryAdjustment(
    userId: string,
    adjustmentType: 'ADJUST' | 'TRANSFER' | 'WRITE_OFF' | 'WRITE_ON',
    itemCode: string,
    context: Omit<WmsOperationContext, 'operationType' | 'itemCode'>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logWmsOperation(
      userId,
      `INVENTORY_${adjustmentType}`,
      'inventory',
      { ...context, operationType: 'INVENTORY_ADJUSTMENT', itemCode },
      metadata
    );
  }

  /**
   * Log cycle count operation
   */
  async logCycleCountOperation(
    userId: string,
    action: 'CREATE' | 'START' | 'COMPLETE' | 'RECONCILE' | 'CANCEL',
    cycleCountId: string,
    context: Omit<WmsOperationContext, 'operationType'>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logWmsOperation(
      userId,
      `CYCLE_COUNT_${action}`,
      'cycle-count',
      { ...context, operationType: 'CYCLE_COUNT' },
      metadata
    );
  }

  /**
   * Log location management
   */
  async logLocationOperation(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | 'UNASSIGN',
    locationId: string,
    context: Omit<WmsOperationContext, 'operationType' | 'locationId'>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logWmsOperation(
      userId,
      `LOCATION_${action}`,
      'location',
      { ...context, operationType: 'LOCATION_MANAGEMENT', locationId },
      metadata
    );
  }

  /**
   * Log equipment operation
   */
  async logEquipmentOperation(
    userId: string,
    action: 'ASSIGN' | 'UNASSIGN' | 'MAINTENANCE' | 'ERROR' | 'STATUS_CHANGE',
    equipmentId: string,
    context: Omit<WmsOperationContext, 'operationType' | 'equipmentId'>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logWmsOperation(
      userId,
      `EQUIPMENT_${action}`,
      'equipment',
      { ...context, operationType: 'EQUIPMENT_OPERATION', equipmentId },
      metadata
    );
  }

  /**
   * Log security violation
   */
  async logSecurityViolation(
    userId: string | null,
    violationType: 'UNAUTHORIZED_ACCESS' | 'PERMISSION_VIOLATION' | 'SUSPICIOUS_ACTIVITY' | 'DATA_BREACH',
    context: WmsOperationContext,
    details: Record<string, any>
  ): Promise<void> {
    await this.auditLoggingService.logSecurityEvent(
      violationType,
      'HIGH',
      {
        userId,
        wmsContext: context,
        ...details,
      }
    );
  }

  /**
   * Get WMS audit logs
   */
  async getWmsAuditLogs(
    operationType?: WmsOperationContext['operationType'],
    warehouseId?: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<WmsAuditLog[]> {
    const criteria: Partial<WmsAuditLog> = {};

    if (operationType) {
      criteria.metadata = { ...criteria.metadata, operationType };
    }

    if (warehouseId) {
      criteria.metadata = { ...criteria.metadata, warehouseId };
    }

    if (userId) {
      criteria.userId = userId;
    }

    const logs = await this.auditLoggingService.searchAuditLogs(criteria, limit);

    return logs.filter(log => log.metadata?.operationType).map(log => ({
      ...log,
      operationType: log.metadata.operationType,
      warehouseId: log.metadata.warehouseId,
      locationId: log.metadata.locationId,
      itemCode: log.metadata.itemCode,
      quantity: log.metadata.quantity,
      batchNumber: log.metadata.batchNumber,
      lotNumber: log.metadata.lotNumber,
      serialNumber: log.metadata.serialNumber,
      operatorId: log.metadata.operatorId,
      equipmentId: log.metadata.equipmentId,
      workOrderId: log.metadata.workOrderId,
      shipmentId: log.metadata.shipmentId,
      pickingOrderId: log.metadata.pickingOrderId,
      receivingOrderId: log.metadata.receivingOrderId,
    }));
  }

  /**
   * Get operation history
   */
  async getOperationHistory(
    resourceId: string,
    resourceType: 'RECEIVING' | 'PICKING' | 'SHIPPING' | 'INVENTORY' | 'LOCATION' | 'EQUIPMENT',
    limit: number = 50
  ): Promise<WmsAuditLog[]> {
    const resourceMap = {
      RECEIVING: 'receiving',
      PICKING: 'picking',
      SHIPPING: 'shipping',
      INVENTORY: 'inventory',
      LOCATION: 'location',
      EQUIPMENT: 'equipment',
    };

    return this.auditLoggingService.getResourceAuditLogs(resourceMap[resourceType], resourceId, limit);
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    warehouseId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalOperations: number;
    operationsByType: Record<string, number>;
    operationsByUser: Record<string, number>;
    securityIncidents: number;
    complianceScore: number;
  }> {
    const logs = await this.getWmsAuditLogs(undefined, warehouseId, undefined, startDate, endDate);

    const operationsByType: Record<string, number> = {};
    const operationsByUser: Record<string, number> = {};
    let securityIncidents = 0;

    logs.forEach(log => {
      if (log.metadata?.operationType) {
        operationsByType[log.metadata.operationType] = (operationsByType[log.metadata.operationType] || 0) + 1;
      }

      if (log.userId) {
        operationsByUser[log.userId] = (operationsByUser[log.userId] || 0) + 1;
      }

      if (log.metadata?.severity === 'HIGH' || log.metadata?.severity === 'CRITICAL') {
        securityIncidents++;
      }
    });

    const complianceScore = Math.max(0, 100 - (securityIncidents * 10) - (logs.length > 1000 ? 10 : 0));

    return {
      totalOperations: logs.length,
      operationsByType,
      operationsByUser,
      securityIncidents,
      complianceScore,
    };
  }

  private getMethodFromAction(action: string): string {
    const actionMethodMap: Record<string, string> = {
      CREATE: 'POST',
      UPDATE: 'PUT',
      COMPLETE: 'POST',
      CANCEL: 'POST',
      START: 'POST',
      PAUSE: 'POST',
      RESUME: 'POST',
      SHIP: 'POST',
      LOAD: 'POST',
      UNLOAD: 'POST',
      ADJUST: 'POST',
      TRANSFER: 'POST',
      RECONCILE: 'POST',
      ASSIGN: 'POST',
      UNASSIGN: 'POST',
      MAINTENANCE: 'POST',
      ERROR: 'POST',
    };

    return actionMethodMap[action] || 'POST';
  }

  private getPathFromContext(context: WmsOperationContext): string {
    let basePath = `/wms/${context.operationType.toLowerCase()}`;

    switch (context.operationType) {
      case 'RECEIVING':
        basePath += context.receivingOrderId ? `/${context.receivingOrderId}` : '';
        break;
      case 'PICKING':
        basePath += context.pickingOrderId ? `/${context.pickingOrderId}` : '';
        break;
      case 'SHIPPING':
        basePath += context.shipmentId ? `/${context.shipmentId}` : '';
        break;
      case 'INVENTORY_ADJUSTMENT':
        basePath += context.itemCode ? `/${context.itemCode}` : '';
        break;
      default:
        basePath += context.warehouseId ? `/${context.warehouseId}` : '';
    }

    return basePath;
  }
}
