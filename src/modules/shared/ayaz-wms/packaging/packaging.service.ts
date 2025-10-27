import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';

/**
 * Kolileme/Paketleme Servisi
 * Carton/Box management - Missing detailed implementation in AyazWMS
 */

interface Carton {
  cartonId: string;
  cartonNumber: string;
  orderNumber: string;
  cartonType: string;
  status: 'open' | 'sealed' | 'shipped';
  items: Array<{
    productId: string;
    sku: string;
    quantity: number;
  }>;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  trackingNumber?: string;
  createdAt: Date;
  sealedAt?: Date;
}

@Injectable()
export class PackagingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly wsGateway: WebSocketGateway,
  ) {}

  /**
   * Kolileme İşlemi
   * Create new carton and add items
   */
  async createCarton(data: {
    orderNumber: string;
    cartonType: 'standard' | 'large' | 'custom';
    warehouseId: string;
  }, userId: string) {
    const cartonNumber = `BOX-${Date.now()}`;

    const carton: Carton = {
      cartonId: `${cartonNumber}-ID`,
      cartonNumber,
      orderNumber: data.orderNumber,
      cartonType: data.cartonType,
      status: 'open',
      items: [],
      weight: 0,
      dimensions: this.getCartonDimensions(data.cartonType),
      createdAt: new Date(),
    };

    await this.eventBus.emit('carton.created', {
      cartonNumber,
      orderNumber: data.orderNumber,
      userId,
    });

    this.wsGateway.sendToRoom(`warehouse:${data.warehouseId}`, 'carton:created', carton);

    return carton;
  }

  /**
   * Koliye Ürün Ekleme
   * Add item to carton
   */
  async addItemToCarton(data: {
    cartonNumber: string;
    productId: string;
    sku: string;
    quantity: number;
    weight: number;
    warehouseId: string;
  }, userId: string) {
    // Validate carton capacity
    const carton = await this.getCartonByNumber(data.cartonNumber);

    if (carton.status !== 'open') {
      throw new BadRequestException('Carton is sealed and cannot be modified');
    }

    const newWeight = carton.weight + data.weight;
    const maxWeight = this.getMaxWeightForCartonType(carton.cartonType);

    if (newWeight > maxWeight) {
      throw new BadRequestException(
        `Carton weight would exceed maximum (${maxWeight}kg). Current: ${carton.weight}kg, Adding: ${data.weight}kg`,
      );
    }

    carton.items.push({
      productId: data.productId,
      sku: data.sku,
      quantity: data.quantity,
    });
    carton.weight = newWeight;

    await this.eventBus.emit('carton.item.added', {
      cartonNumber: data.cartonNumber,
      productId: data.productId,
      quantity: data.quantity,
    });

    this.wsGateway.sendToRoom(`warehouse:${data.warehouseId}`, 'carton:updated', carton);

    return carton;
  }

  /**
   * ITS Kolileme İşlemi
   * ITS (Intelligent Tracking System) carton packaging
   */
  async createITSCarton(data: {
    orderNumber: string;
    items: Array<{
      productId: string;
      quantity: number;
    }>;
    autoOptimize: boolean;
    warehouseId: string;
  }, userId: string) {
    if (data.autoOptimize) {
      // AI-powered carton optimization
      const optimized = await this.optimizeCartonPacking(data.items);
      
      const cartons = [];
      for (const cartonPlan of optimized) {
        const carton = await this.createCarton({
          orderNumber: data.orderNumber,
          cartonType: cartonPlan.type,
          warehouseId: data.warehouseId,
        }, userId);

        for (const item of cartonPlan.items) {
          await this.addItemToCarton({
            cartonNumber: carton.cartonNumber,
            ...item,
            warehouseId: data.warehouseId,
          }, userId);
        }

        cartons.push(carton);
      }

      return {
        orderNumber: data.orderNumber,
        totalCartons: cartons.length,
        optimized: true,
        cartons,
      };
    }

    // Manual carton creation
    return await this.createCarton({
      orderNumber: data.orderNumber,
      cartonType: 'standard',
      warehouseId: data.warehouseId,
    }, userId);
  }

  /**
   * Koli Son Kontrol İşlemi
   * Final carton check before sealing
   */
  async performFinalCartonCheck(data: {
    cartonNumber: string;
    expectedItems: Array<{
      productId: string;
      quantity: number;
    }>;
    actualWeight: number;
    warehouseId: string;
  }, userId: string) {
    const carton = await this.getCartonByNumber(data.cartonNumber);

    const discrepancies = [];

    for (const expected of data.expectedItems) {
      const actual = carton.items.find((i) => i.productId === expected.productId);
      
      if (!actual) {
        discrepancies.push({
          productId: expected.productId,
          issue: 'missing',
          expected: expected.quantity,
          actual: 0,
        });
      } else if (actual.quantity !== expected.quantity) {
        discrepancies.push({
          productId: expected.productId,
          issue: 'quantity_mismatch',
          expected: expected.quantity,
          actual: actual.quantity,
        });
      }
    }

    // Weight verification
    const weightVariance = Math.abs(data.actualWeight - carton.weight);
    const weightTolerance = carton.weight * 0.05; // 5% tolerance

    if (weightVariance > weightTolerance) {
      discrepancies.push({
        issue: 'weight_mismatch',
        expected: carton.weight,
        actual: data.actualWeight,
        variance: weightVariance,
      });
    }

    const passed = discrepancies.length === 0;

    await this.eventBus.emit('carton.final.check', {
      cartonNumber: data.cartonNumber,
      passed,
      discrepancyCount: discrepancies.length,
      userId,
    });

    return {
      cartonNumber: data.cartonNumber,
      passed,
      discrepancies,
      status: passed ? 'approved' : 'review_required',
      checkedBy: userId,
      timestamp: new Date(),
    };
  }

  /**
   * Koli Aktarma İşlemi
   * Transfer items between cartons
   */
  async transferCartonItems(data: {
    fromCarton: string;
    toCarton: string;
    items: Array<{
      productId: string;
      quantity: number;
    }>;
    warehouseId: string;
  }, userId: string) {
    const sourceCarton = await this.getCartonByNumber(data.fromCarton);
    const targetCarton = await this.getCartonByNumber(data.toCarton);

    if (sourceCarton.status !== 'open' || targetCarton.status !== 'open') {
      throw new BadRequestException('Both cartons must be open for transfer');
    }

    for (const transferItem of data.items) {
      const sourceItem = sourceCarton.items.find((i) => i.productId === transferItem.productId);
      
      if (!sourceItem || sourceItem.quantity < transferItem.quantity) {
        throw new BadRequestException(
          `Insufficient quantity in source carton for product ${transferItem.productId}`,
        );
      }

      // Remove from source
      sourceItem.quantity -= transferItem.quantity;
      if (sourceItem.quantity === 0) {
        sourceCarton.items = sourceCarton.items.filter((i) => i.productId !== transferItem.productId);
      }

      // Add to target
      const targetItem = targetCarton.items.find((i) => i.productId === transferItem.productId);
      if (targetItem) {
        targetItem.quantity += transferItem.quantity;
      } else {
        targetCarton.items.push({
          productId: transferItem.productId,
          sku: sourceItem.sku,
          quantity: transferItem.quantity,
        });
      }
    }

    await this.eventBus.emit('carton.transfer', {
      fromCarton: data.fromCarton,
      toCarton: data.toCarton,
      itemCount: data.items.length,
      userId,
    });

    return {
      transferId: `TRF-${Date.now()}`,
      fromCarton: data.fromCarton,
      toCarton: data.toCarton,
      transferredItems: data.items.length,
      timestamp: new Date(),
    };
  }

  /**
   * Koli Yükleme İşlemi
   * Load carton to vehicle
   */
  async loadCartonToVehicle(data: {
    cartonNumbers: string[];
    vehicleId: string;
    dockNumber: string;
    warehouseId: string;
  }, userId: string) {
    for (const cartonNumber of data.cartonNumbers) {
      const carton = await this.getCartonByNumber(cartonNumber);
      
      if (carton.status !== 'sealed') {
        throw new BadRequestException(`Carton ${cartonNumber} must be sealed before loading`);
      }
    }

    const loadId = `LOAD-${Date.now()}`;

    await this.eventBus.emit('cartons.loaded', {
      loadId,
      cartonCount: data.cartonNumbers.length,
      vehicleId: data.vehicleId,
      userId,
    });

    return {
      loadId,
      cartonCount: data.cartonNumbers.length,
      vehicleId: data.vehicleId,
      dockNumber: data.dockNumber,
      loadedAt: new Date(),
    };
  }

  /**
   * Koli Silme İşlemi
   * Delete/void carton
   */
  async deleteCarton(cartonNumber: string, reason: string, warehouseId: string, userId: string) {
    const carton = await this.getCartonByNumber(cartonNumber);

    if (carton.status === 'shipped') {
      throw new BadRequestException('Cannot delete shipped carton');
    }

    await this.eventBus.emit('carton.deleted', {
      cartonNumber,
      reason,
      userId,
    });

    return {
      cartonNumber,
      status: 'deleted',
      reason,
      deletedBy: userId,
      deletedAt: new Date(),
    };
  }

  /**
   * Koli Kargo Teslimi
   * Hand over carton to carrier
   */
  async handoverToCarrier(data: {
    cartonNumbers: string[];
    carrierCode: string;
    driverName: string;
    vehiclePlate: string;
    warehouseId: string;
  }, userId: string) {
    for (const cartonNumber of data.cartonNumbers) {
      const carton = await this.getCartonByNumber(cartonNumber);
      carton.status = 'shipped';
    }

    const handoverId = `HO-${Date.now()}`;

    await this.eventBus.emit('cartons.handover', {
      handoverId,
      cartonCount: data.cartonNumbers.length,
      carrier: data.carrierCode,
      userId,
    });

    return {
      handoverId,
      cartonCount: data.cartonNumbers.length,
      carrier: data.carrierCode,
      driver: data.driverName,
      vehicle: data.vehiclePlate,
      handoverTime: new Date(),
    };
  }

  /**
   * Koli Sorgulama
   * Query carton details
   */
  async queryCarton(cartonNumber: string) {
    return await this.getCartonByNumber(cartonNumber);
  }

  // Helper methods
  private async getCartonByNumber(cartonNumber: string): Promise<Carton> {
    // Mock - would query cartons table
    return {
      cartonId: `${cartonNumber}-ID`,
      cartonNumber,
      orderNumber: 'ORD-001',
      cartonType: 'standard',
      status: 'open',
      items: [],
      weight: 0,
      dimensions: { length: 40, width: 30, height: 30 },
      createdAt: new Date(),
    };
  }

  private getCartonDimensions(type: string) {
    const dimensions = {
      standard: { length: 40, width: 30, height: 30 },
      large: { length: 60, width: 40, height: 40 },
      custom: { length: 0, width: 0, height: 0 },
    };
    return dimensions[type] || dimensions.standard;
  }

  private getMaxWeightForCartonType(type: string): number {
    const weights = {
      standard: 25,
      large: 50,
      custom: 100,
    };
    return weights[type] || 25;
  }

  private async optimizeCartonPacking(items: any[]) {
    // Simple bin packing algorithm
    const cartons = [];
    let currentCarton = { type: 'standard', items: [], weight: 0 };
    const maxWeight = 25;

    for (const item of items) {
      const itemWeight = item.weight || 5;
      
      if (currentCarton.weight + itemWeight > maxWeight) {
        cartons.push(currentCarton);
        currentCarton = { type: 'standard', items: [], weight: 0 };
      }

      currentCarton.items.push(item);
      currentCarton.weight += itemWeight;
    }

    if (currentCarton.items.length > 0) {
      cartons.push(currentCarton);
    }

    return cartons;
  }

  /**
   * Kolileme Durumu İzleme
   * Monitor packaging status for order
   */
  async monitorPackagingStatus(orderNumber: string, warehouseId: string) {
    // Would query all cartons for order
    return {
      orderNumber,
      totalCartons: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      cartons: [],
    };
  }
}

