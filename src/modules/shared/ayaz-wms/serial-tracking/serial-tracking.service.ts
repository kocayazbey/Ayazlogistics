import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface SerialNumber {
  id: string;
  serialNumber: string;
  productId: string;
  customerId: string;
  warehouseId: string;
  locationId?: string;
  status: 'available' | 'reserved' | 'picked' | 'shipped' | 'sold' | 'returned' | 'defective';
  manufacturingDate?: Date;
  expiryDate?: Date;
  warrantyExpiryDate?: Date;
  metadata?: {
    imei?: string;
    macAddress?: string;
    batchNumber?: string;
    lotNumber?: string;
    manufacturer?: string;
    model?: string;
  };
  history: Array<{
    event: string;
    timestamp: Date;
    userId?: string;
    location?: string;
    notes?: string;
  }>;
  createdAt: Date;
  updatedAt?: Date;
}

@Injectable()
export class SerialTrackingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async registerSerial(
    data: {
      serialNumber: string;
      productId: string;
      customerId: string;
      warehouseId: string;
      locationId?: string;
      manufacturingDate?: Date;
      expiryDate?: Date;
      warrantyExpiryDate?: Date;
      metadata?: any;
    },
    tenantId: string,
    userId: string,
  ): Promise<SerialNumber> {
    const existing = await this.getSerialByNumber(data.serialNumber, tenantId);

    if (existing) {
      throw new Error(`Serial number ${data.serialNumber} already exists`);
    }

    const serialId = `SN-${Date.now()}`;

    const serial: SerialNumber = {
      id: serialId,
      ...data,
      status: 'available',
      history: [
        {
          event: 'registered',
          timestamp: new Date(),
          userId,
          location: data.locationId,
        },
      ],
      createdAt: new Date(),
    };

    await this.eventBus.emit('serial.registered', {
      serialId,
      serialNumber: data.serialNumber,
      productId: data.productId,
      customerId: data.customerId,
      tenantId,
    });

    return serial;
  }

  async getSerialByNumber(serialNumber: string, tenantId: string): Promise<SerialNumber | null> {
    // Mock: Would query serial_numbers table
    return null;
  }

  async updateSerialStatus(
    serialNumber: string,
    status: SerialNumber['status'],
    location?: string,
    notes?: string,
    tenantId?: string,
    userId?: string,
  ): Promise<void> {
    await this.eventBus.emit('serial.status.updated', {
      serialNumber,
      status,
      location,
      userId,
      timestamp: new Date(),
      tenantId,
    });
  }

  async pickSerial(
    serialNumber: string,
    orderId: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.updateSerialStatus(serialNumber, 'picked', undefined, `Picked for order ${orderId}`, tenantId, userId);

    await this.eventBus.emit('serial.picked', {
      serialNumber,
      orderId,
      pickedBy: userId,
      timestamp: new Date(),
      tenantId,
    });
  }

  async shipSerial(
    serialNumber: string,
    shipmentId: string,
    trackingNumber: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.updateSerialStatus(serialNumber, 'shipped', undefined, `Shipped with ${trackingNumber}`, tenantId, userId);

    await this.eventBus.emit('serial.shipped', {
      serialNumber,
      shipmentId,
      trackingNumber,
      shippedBy: userId,
      timestamp: new Date(),
      tenantId,
    });
  }

  async returnSerial(
    serialNumber: string,
    returnReason: string,
    condition: 'good' | 'damaged' | 'defective',
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const newStatus = condition === 'defective' ? 'defective' : 'returned';

    await this.updateSerialStatus(serialNumber, newStatus, undefined, `Returned: ${returnReason}`, tenantId, userId);

    await this.eventBus.emit('serial.returned', {
      serialNumber,
      returnReason,
      condition,
      returnedBy: userId,
      timestamp: new Date(),
      tenantId,
    });
  }

  async getSerialHistory(serialNumber: string, tenantId: string): Promise<SerialNumber['history']> {
    const serial = await this.getSerialByNumber(serialNumber, tenantId);
    return serial?.history || [];
  }

  async getProductSerials(
    productId: string,
    warehouseId: string,
    status?: SerialNumber['status'],
    tenantId?: string,
  ): Promise<SerialNumber[]> {
    // Mock: Would query serial_numbers table
    return [];
  }

  async validateSerialForPicking(
    serialNumber: string,
    productId: string,
    customerId: string,
    tenantId: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    const serial = await this.getSerialByNumber(serialNumber, tenantId);

    if (!serial) {
      return { valid: false, reason: 'Serial number not found' };
    }

    if (serial.productId !== productId) {
      return { valid: false, reason: 'Serial number belongs to different product' };
    }

    if (serial.customerId !== customerId) {
      return { valid: false, reason: 'Serial number belongs to different customer' };
    }

    if (serial.status !== 'available') {
      return { valid: false, reason: `Serial is ${serial.status}, not available` };
    }

    if (serial.expiryDate && serial.expiryDate < new Date()) {
      return { valid: false, reason: 'Serial number has expired' };
    }

    return { valid: true };
  }

  async bulkRegisterSerials(
    data: {
      productId: string;
      customerId: string;
      warehouseId: string;
      locationId: string;
      serialNumbers: string[];
      manufacturingDate?: Date;
      warrantyExpiryDate?: Date;
    },
    tenantId: string,
    userId: string,
  ): Promise<{ registered: number; failed: number; errors: string[] }> {
    let registered = 0;
    const errors: string[] = [];

    for (const serialNumber of data.serialNumbers) {
      try {
        await this.registerSerial(
          {
            serialNumber,
            productId: data.productId,
            customerId: data.customerId,
            warehouseId: data.warehouseId,
            locationId: data.locationId,
            manufacturingDate: data.manufacturingDate,
            warrantyExpiryDate: data.warrantyExpiryDate,
          },
          tenantId,
          userId,
        );
        registered++;
      } catch (error: any) {
        errors.push(`${serialNumber}: ${error.message}`);
      }
    }

    return {
      registered,
      failed: errors.length,
      errors,
    };
  }

  async getSerialReport(
    filters: {
      customerId?: string;
      productId?: string;
      warehouseId?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
    tenantId: string,
  ): Promise<any> {
    return {
      filters,
      summary: {
        total: 0,
        available: 0,
        shipped: 0,
        sold: 0,
        returned: 0,
        defective: 0,
      },
      serials: [],
    };
  }
}

