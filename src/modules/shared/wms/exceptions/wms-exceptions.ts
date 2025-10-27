import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * WMS Custom Exceptions
 */

export class InsufficientInventoryException extends HttpException {
  constructor(productId: string, required: number, available: number) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'WMS_INSUFFICIENT_INVENTORY',
        message: `Insufficient inventory for product ${productId}`,
        details: {
          productId,
          required,
          available,
          shortage: required - available,
        },
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class LocationNotAvailableException extends HttpException {
  constructor(locationId: string, reason?: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'WMS_LOCATION_NOT_AVAILABLE',
        message: `Location ${locationId} is not available`,
        details: {
          locationId,
          reason: reason || 'Location is occupied or locked',
        },
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class InvalidPickingStrategyException extends HttpException {
  constructor(strategy: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'WMS_INVALID_PICKING_STRATEGY',
        message: `Invalid picking strategy: ${strategy}`,
        details: {
          strategy,
          validStrategies: ['FIFO', 'LIFO', 'FEFO', 'ZONE', 'BATCH'],
        },
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class ReceivingOrderNotFoundException extends HttpException {
  constructor(receivingOrderId: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: 'WMS_RECEIVING_ORDER_NOT_FOUND',
        message: `Receiving order ${receivingOrderId} not found`,
        details: { receivingOrderId },
      },
      HttpStatus.NOT_FOUND
    );
  }
}

export class PickingOrderNotFoundException extends HttpException {
  constructor(pickingOrderId: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: 'WMS_PICKING_ORDER_NOT_FOUND',
        message: `Picking order ${pickingOrderId} not found`,
        details: { pickingOrderId },
      },
      HttpStatus.NOT_FOUND
    );
  }
}

export class WarehouseNotFoundException extends HttpException {
  constructor(warehouseId: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: 'WMS_WAREHOUSE_NOT_FOUND',
        message: `Warehouse ${warehouseId} not found`,
        details: { warehouseId },
      },
      HttpStatus.NOT_FOUND
    );
  }
}

export class InvalidOperationStateException extends HttpException {
  constructor(operationType: string, currentState: string, requiredState: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'WMS_INVALID_OPERATION_STATE',
        message: `Cannot perform ${operationType} in ${currentState} state`,
        details: {
          operationType,
          currentState,
          requiredState,
        },
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class QualityCheckFailedException extends HttpException {
  constructor(orderId: string, defects: string[]) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'WMS_QUALITY_CHECK_FAILED',
        message: `Quality check failed for order ${orderId}`,
        details: {
          orderId,
          defects,
          action: 'Manual review required',
        },
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class BatchAllocationException extends HttpException {
  constructor(productId: string, requiredQuantity: number, message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'WMS_BATCH_ALLOCATION_FAILED',
        message: `Failed to allocate batches for product ${productId}`,
        details: {
          productId,
          requiredQuantity,
          reason: message,
        },
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class PalletWeightExceededException extends HttpException {
  constructor(palletId: string, currentWeight: number, maxWeight: number, attemptedWeight: number) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'WMS_PALLET_WEIGHT_EXCEEDED',
        message: `Adding items would exceed pallet weight limit`,
        details: {
          palletId,
          currentWeight,
          maxWeight,
          attemptedWeight,
          overweight: (currentWeight + attemptedWeight) - maxWeight,
        },
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class AgvNotAvailableException extends HttpException {
  constructor(agvId: string, currentStatus: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'WMS_AGV_NOT_AVAILABLE',
        message: `AGV ${agvId} is not available`,
        details: {
          agvId,
          currentStatus,
          availableStatuses: ['idle'],
        },
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

