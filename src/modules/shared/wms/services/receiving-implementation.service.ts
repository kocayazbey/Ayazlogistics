import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte, inArray } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { receivingOrders, inventory, products, warehouses } from '../../../../database/schema/shared/wms.schema';
import { InsufficientStockException, InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

interface ReceivingItem {
  productId: string;
  productSku?: string;
  productName?: string;
  expectedQuantity: number;
  receivedQuantity?: number;
  acceptedQuantity?: number;
  rejectedQuantity?: number;
  damagedQuantity?: number;
  unitCost?: number;
  location?: string;
  lotNumber?: string;
  expiryDate?: Date;
  serialNumbers?: string[];
  notes?: string;
  qualityCheckStatus?: 'pending' | 'passed' | 'failed';
  qualityCheckNotes?: string;
}

interface ReceivingQualityCheck {
  productId: string;
  sampleSize: number;
  defectsFound: number;
  defectTypes: string[];
  inspector: string;
  inspectionDate: Date;
  passed: boolean;
  notes: string;
  images?: string[];
}

interface ReceivingDiscrepancy {
  productId: string;
  expectedQuantity: number;
  receivedQuantity: number;
  variance: number;
  variancePercentage: number;
  reason?: string;
  action: 'accept' | 'reject' | 'partial_accept';
}

interface ReceivingMetrics {
  totalReceivingOrders: number;
  completedOrders: number;
  averageProcessingTime: number;
  accuracyRate: number;
  onTimeRate: number;
  qualityPassRate: number;
  totalItemsReceived: number;
  totalDamageRate: number;
}

interface PutawayRecommendation {
  productId: string;
  quantity: number;
  recommendedLocations: Array<{
    location: string;
    zone: string;
    capacity: number;
    currentOccupancy: number;
    distance: number;
    score: number;
    reason: string;
  }>;
}

@Injectable()
export class ReceivingImplementationService {
  private readonly logger = new Logger(ReceivingImplementationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  async createReceivingOrder(data: {
    tenantId: string;
    warehouseId: string;
    supplierId?: string;
    purchaseOrderId?: string;
    expectedDate: Date;
    items: ReceivingItem[];
    notes?: string;
    createdBy: string;
    requiresQualityCheck?: boolean;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }): Promise<any> {
    this.logger.log(`Creating receiving order for warehouse ${data.warehouseId}`);

    const receivingNumber = await this.generateReceivingNumber(data.tenantId);

    const [warehouse] = await this.db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, data.warehouseId))
      .limit(1);

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const enrichedItems = await this.enrichReceivingItems(data.items, data.tenantId);

    const totalExpectedQuantity = enrichedItems.reduce((sum, item) => sum + item.expectedQuantity, 0);
    const totalExpectedValue = enrichedItems.reduce(
      (sum, item) => sum + item.expectedQuantity * (item.unitCost || 0),
      0,
    );

    const [receiving] = await this.db.insert(receivingOrders).values({
      tenantId: data.tenantId,
      warehouseId: data.warehouseId,
      receivingNumber,
      supplierId: data.supplierId,
      purchaseOrderNumber: data.purchaseOrderId,
      expectedDate: data.expectedDate,
      status: 'expected',
      items: enrichedItems as any,
      notes: data.notes,
      createdBy: data.createdBy,
      metadata: {
        requiresQualityCheck: data.requiresQualityCheck || false,
        priority: data.priority || 'normal',
        totalExpectedQuantity,
        totalExpectedValue,
        itemCount: enrichedItems.length,
      },
    }).returning();

    await this.eventBus.emit('receiving.order.created', {
      receivingId: receiving.id,
      receivingNumber,
      warehouseId: data.warehouseId,
      itemCount: enrichedItems.length,
      totalExpectedQuantity,
      priority: data.priority,
    });

    await this.invalidateCache(data.tenantId, data.warehouseId);

    this.logger.log(`Receiving order created: ${receivingNumber}`);

    return receiving;
  }

  async startReceiving(receivingId: string, userId: string): Promise<any> {
    const [receiving] = await this.db
      .select()
      .from(receivingOrders)
      .where(eq(receivingOrders.id, receivingId))
      .limit(1);

    if (!receiving) {
      throw new NotFoundException('Receiving order not found');
    }

    if (receiving.status !== 'expected') {
      throw new InvalidStateTransitionException(
        'ReceivingOrder',
        receiving.status,
        'in_progress',
      );
    }

    const [updated] = await this.db
      .update(receivingOrders)
      .set({
        status: 'in_progress',
        receivedBy: userId,
        receivedDate: new Date(),
        metadata: sql`COALESCE(${receivingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({ startedAt: new Date() })}::jsonb`,
      })
      .where(eq(receivingOrders.id, receivingId))
      .returning();

    await this.eventBus.emit('receiving.started', {
      receivingId,
      userId,
      receivingNumber: receiving.receivingNumber,
    });

    this.logger.log(`Receiving started: ${receiving.receivingNumber} by user ${userId}`);

    return updated;
  }

  async receiveItem(data: {
    receivingId: string;
    productId: string;
    receivedQuantity: number;
    location: string;
    lotNumber?: string;
    expiryDate?: Date;
    serialNumbers?: string[];
    damageQuantity?: number;
    damageReason?: string;
    qualityCheckPassed?: boolean;
    qualityCheckNotes?: string;
    notes?: string;
    receivedBy: string;
  }): Promise<any> {
    this.logger.debug(`Receiving item ${data.productId}, quantity: ${data.receivedQuantity}`);

    const [receiving] = await this.db
      .select()
      .from(receivingOrders)
      .where(eq(receivingOrders.id, data.receivingId))
      .limit(1);

    if (!receiving) {
      throw new NotFoundException('Receiving order not found');
    }

    if (receiving.status !== 'in_progress') {
      throw new BadRequestException(`Receiving order is not in progress. Current status: ${receiving.status}`);
    }

    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, data.productId))
      .limit(1);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const acceptedQuantity = data.receivedQuantity - (data.damageQuantity || 0);

    if (acceptedQuantity > 0) {
      const [existingInventory] = await this.db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, data.productId),
            eq(inventory.warehouseId, receiving.warehouseId),
            eq(inventory.location, data.location),
            data.lotNumber ? eq(inventory.lotNumber, data.lotNumber) : sql`${inventory.lotNumber} IS NULL`,
          ),
        )
        .limit(1);

      if (existingInventory) {
        await this.db
          .update(inventory)
          .set({
            quantityOnHand: sql`${inventory.quantityOnHand} + ${acceptedQuantity}`,
            quantityAvailable: sql`${inventory.quantityAvailable} + ${acceptedQuantity}`,
            updatedAt: new Date(),
            metadata: sql`COALESCE(${inventory.metadata}, '{}'::jsonb) || ${JSON.stringify({
              lastReceived: new Date(),
              lastReceivedQuantity: acceptedQuantity,
            })}::jsonb`,
          })
          .where(eq(inventory.id, existingInventory.id));

        this.logger.debug(`Updated existing inventory at location ${data.location}`);
      } else {
        await this.db.insert(inventory).values({
          tenantId: receiving.tenantId,
          warehouseId: receiving.warehouseId,
          productId: data.productId,
          location: data.location,
          quantityOnHand: acceptedQuantity,
          quantityAvailable: acceptedQuantity,
          quantityReserved: 0,
          lotNumber: data.lotNumber,
          expiryDate: data.expiryDate,
          serialNumbers: data.serialNumbers as any,
          metadata: {
            receivedDate: new Date(),
            receivedBy: data.receivedBy,
          },
        });

        this.logger.debug(`Created new inventory record at location ${data.location}`);
      }
    }

    const items = receiving.items as ReceivingItem[];
    const updatedItems = items.map(item => {
      if (item.productId === data.productId) {
        return {
          ...item,
          receivedQuantity: (item.receivedQuantity || 0) + data.receivedQuantity,
          acceptedQuantity: (item.acceptedQuantity || 0) + acceptedQuantity,
          damagedQuantity: (item.damagedQuantity || 0) + (data.damageQuantity || 0),
          location: data.location,
          lotNumber: data.lotNumber,
          expiryDate: data.expiryDate,
          serialNumbers: data.serialNumbers,
          qualityCheckStatus: data.qualityCheckPassed ? 'passed' : 'failed',
          qualityCheckNotes: data.qualityCheckNotes,
          notes: data.notes,
        };
      }
      return item;
    });

    await this.db
      .update(receivingOrders)
      .set({
        items: updatedItems as any,
        metadata: sql`COALESCE(${receivingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({
          lastItemReceived: new Date(),
          totalReceivedSoFar: updatedItems.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0),
        })}::jsonb`,
      })
      .where(eq(receivingOrders.id, data.receivingId));

    if (data.damageQuantity && data.damageQuantity > 0) {
      await this.eventBus.emit('receiving.damage.reported', {
        receivingId: data.receivingId,
        productId: data.productId,
        damageQuantity: data.damageQuantity,
        damageReason: data.damageReason,
      });
    }

    await this.eventBus.emit('receiving.item.received', {
      receivingId: data.receivingId,
      productId: data.productId,
      productSku: product.sku,
      receivedQuantity: data.receivedQuantity,
      acceptedQuantity,
      damagedQuantity: data.damageQuantity || 0,
      location: data.location,
      lotNumber: data.lotNumber,
    });

    await this.invalidateCache(receiving.tenantId, receiving.warehouseId);

    return {
      receivingId: data.receivingId,
      productId: data.productId,
      productSku: product.sku,
      productName: product.name,
      receivedQuantity: data.receivedQuantity,
      acceptedQuantity,
      damagedQuantity: data.damageQuantity || 0,
      location: data.location,
      lotNumber: data.lotNumber,
      expiryDate: data.expiryDate,
      serialNumbers: data.serialNumbers,
      timestamp: new Date(),
    };
  }

  async performQualityCheck(data: {
    receivingId: string;
    productId: string;
    sampleSize: number;
    defectsFound: number;
    defectTypes: string[];
    passed: boolean;
    inspector: string;
    notes: string;
    images?: string[];
  }): Promise<ReceivingQualityCheck> {
    const qualityCheck: ReceivingQualityCheck = {
      productId: data.productId,
      sampleSize: data.sampleSize,
      defectsFound: data.defectsFound,
      defectTypes: data.defectTypes,
      inspector: data.inspector,
      inspectionDate: new Date(),
      passed: data.passed,
      notes: data.notes,
      images: data.images,
    };

    await this.db
      .update(receivingOrders)
      .set({
        metadata: sql`COALESCE(${receivingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({
          qualityChecks: [qualityCheck],
        })}::jsonb`,
      })
      .where(eq(receivingOrders.id, data.receivingId));

    await this.eventBus.emit('receiving.quality.check.performed', {
      receivingId: data.receivingId,
      productId: data.productId,
      passed: data.passed,
      defectsFound: data.defectsFound,
    });

    this.logger.log(
      `Quality check ${data.passed ? 'PASSED' : 'FAILED'} for product ${data.productId}. Defects: ${data.defectsFound}/${data.sampleSize}`,
    );

    return qualityCheck;
  }

  async reportDiscrepancy(data: {
    receivingId: string;
    productId: string;
    expectedQuantity: number;
    receivedQuantity: number;
    reason: string;
    action: 'accept' | 'reject' | 'partial_accept';
    reportedBy: string;
  }): Promise<ReceivingDiscrepancy> {
    const variance = data.receivedQuantity - data.expectedQuantity;
    const variancePercentage = (variance / data.expectedQuantity) * 100;

    const discrepancy: ReceivingDiscrepancy = {
      productId: data.productId,
      expectedQuantity: data.expectedQuantity,
      receivedQuantity: data.receivedQuantity,
      variance,
      variancePercentage,
      reason: data.reason,
      action: data.action,
    };

    await this.db
      .update(receivingOrders)
      .set({
        metadata: sql`COALESCE(${receivingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({
          discrepancies: [discrepancy],
        })}::jsonb`,
      })
      .where(eq(receivingOrders.id, data.receivingId));

    await this.eventBus.emit('receiving.discrepancy.reported', {
      receivingId: data.receivingId,
      productId: data.productId,
      variance,
      variancePercentage,
      action: data.action,
    });

    this.logger.warn(
      `Discrepancy reported for receiving ${data.receivingId}. Variance: ${variance} (${variancePercentage.toFixed(2)}%)`,
    );

    return discrepancy;
  }

  async generatePutawayRecommendations(
    receivingId: string,
    productId: string,
    quantity: number,
  ): Promise<PutawayRecommendation> {
    const [receiving] = await this.db
      .select()
      .from(receivingOrders)
      .where(eq(receivingOrders.id, receivingId))
      .limit(1);

    if (!receiving) {
      throw new NotFoundException('Receiving order not found');
    }

    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    const recommendations = [
      {
        location: 'A-01-01',
        zone: 'Fast Moving',
        capacity: 1000,
        currentOccupancy: 450,
        distance: 15,
        score: 95,
        reason: 'Close to shipping dock, high-velocity zone',
      },
      {
        location: 'A-02-03',
        zone: 'Fast Moving',
        capacity: 800,
        currentOccupancy: 300,
        distance: 20,
        score: 88,
        reason: 'Good capacity, moderate distance',
      },
      {
        location: 'B-01-05',
        zone: 'Reserve',
        capacity: 1500,
        currentOccupancy: 200,
        distance: 45,
        score: 75,
        reason: 'Large capacity, further from dock',
      },
    ];

    if (product?.metadata?.category === 'refrigerated') {
      recommendations.unshift({
        location: 'COLD-01',
        zone: 'Temperature Controlled',
        capacity: 500,
        currentOccupancy: 200,
        distance: 25,
        score: 98,
        reason: 'Temperature controlled zone - REQUIRED',
      });
    }

    if (product?.metadata?.hazmat) {
      recommendations.unshift({
        location: 'HAZ-01',
        zone: 'Hazmat',
        capacity: 300,
        currentOccupancy: 50,
        distance: 60,
        score: 100,
        reason: 'Hazmat certified storage - MANDATORY',
      });
    }

    return {
      productId,
      quantity,
      recommendedLocations: recommendations,
    };
  }

  async putaway(data: {
    receivingId: string;
    productId: string;
    quantity: number;
    fromLocation: string;
    toLocation: string;
    lotNumber?: string;
    expiryDate?: Date;
    userId: string;
  }): Promise<any> {
    this.logger.log(`Putaway: Moving ${data.quantity} units from ${data.fromLocation} to ${data.toLocation}`);

    const [inventory] = await this.db
      .select()
      .from(inventory as any)
      .where(
        and(
          eq((inventory as any).productId, data.productId),
          eq((inventory as any).location, data.toLocation),
        ),
      )
      .limit(1);

    if (inventory) {
      await this.db
        .update(inventory as any)
        .set({
          quantityOnHand: sql`${(inventory as any).quantityOnHand} + ${data.quantity}`,
          quantityAvailable: sql`${(inventory as any).quantityAvailable} + ${data.quantity}`,
        })
        .where(eq((inventory as any).id, inventory.id));
    }

    await this.eventBus.emit('receiving.putaway.completed', {
      receivingId: data.receivingId,
      productId: data.productId,
      quantity: data.quantity,
      location: data.toLocation,
    });

    return {
      success: true,
      productId: data.productId,
      quantity: data.quantity,
      toLocation: data.toLocation,
      timestamp: new Date(),
    };
  }

  async completeReceiving(receivingId: string, userId: string): Promise<any> {
    const [receiving] = await this.db
      .select()
      .from(receivingOrders)
      .where(eq(receivingOrders.id, receivingId))
      .limit(1);

    if (!receiving) {
      throw new NotFoundException('Receiving order not found');
    }

    if (receiving.status !== 'in_progress') {
      throw new InvalidStateTransitionException(
        'ReceivingOrder',
        receiving.status,
        'completed',
      );
    }

    const items = receiving.items as ReceivingItem[];
    const totalExpected = items.reduce((sum, item) => sum + item.expectedQuantity, 0);
    const totalReceived = items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    const totalAccepted = items.reduce((sum, item) => sum + (item.acceptedQuantity || 0), 0);
    const totalDamaged = items.reduce((sum, item) => sum + (item.damagedQuantity || 0), 0);

    const accuracyRate = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;

    const completionMetrics = {
      totalExpected,
      totalReceived,
      totalAccepted,
      totalDamaged,
      accuracyRate: parseFloat(accuracyRate.toFixed(2)),
      completedAt: new Date(),
      completedBy: userId,
      processingTime: receiving.receivedDate
        ? (new Date().getTime() - new Date(receiving.receivedDate).getTime()) / (1000 * 60)
        : 0,
    };

    const [updated] = await this.db
      .update(receivingOrders)
      .set({
        status: 'completed',
        completedAt: new Date(),
        completedBy: userId,
        metadata: sql`COALESCE(${receivingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify(completionMetrics)}::jsonb`,
      })
      .where(eq(receivingOrders.id, receivingId))
      .returning();

    await this.eventBus.emit('receiving.completed', {
      receivingId,
      receivingNumber: receiving.receivingNumber,
      userId,
      metrics: completionMetrics,
    });

    await this.invalidateCache(receiving.tenantId, receiving.warehouseId);

    this.logger.log(
      `Receiving completed: ${receiving.receivingNumber}. Accuracy: ${accuracyRate.toFixed(2)}%, Processing time: ${completionMetrics.processingTime.toFixed(2)} min`,
    );

    return updated;
  }

  async getReceivingOrders(tenantId: string, filters?: {
    warehouseId?: string;
    status?: string;
    supplierId?: string;
    startDate?: Date;
    endDate?: Date;
    priority?: string;
  }): Promise<any[]> {
    let conditions = [eq(receivingOrders.tenantId, tenantId)];

    if (filters?.warehouseId) {
      conditions.push(eq(receivingOrders.warehouseId, filters.warehouseId));
    }

    if (filters?.status) {
      conditions.push(eq(receivingOrders.status, filters.status));
    }

    if (filters?.supplierId) {
      conditions.push(eq(receivingOrders.supplierId, filters.supplierId));
    }

    if (filters?.startDate) {
      conditions.push(gte(receivingOrders.expectedDate, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(receivingOrders.expectedDate, filters.endDate));
    }

    const query = conditions.length > 1
      ? this.db.select().from(receivingOrders).where(and(...conditions))
      : this.db.select().from(receivingOrders).where(conditions[0]);

    return await query;
  }

  async getReceivingOrderById(receivingId: string, tenantId: string): Promise<any> {
    const [receiving] = await this.db
      .select()
      .from(receivingOrders)
      .where(and(eq(receivingOrders.id, receivingId), eq(receivingOrders.tenantId, tenantId)))
      .limit(1);

    if (!receiving) {
      throw new NotFoundException('Receiving order not found');
    }

    const items = receiving.items as ReceivingItem[];
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const [product] = await this.db
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        return {
          ...item,
          productSku: product?.sku,
          productName: product?.name,
          productDescription: product?.description,
        };
      }),
    );

    return {
      ...receiving,
      items: enrichedItems,
    };
  }

  async cancelReceiving(receivingId: string, reason: string, userId: string): Promise<any> {
    const [receiving] = await this.db
      .select()
      .from(receivingOrders)
      .where(eq(receivingOrders.id, receivingId))
      .limit(1);

    if (!receiving) {
      throw new NotFoundException('Receiving order not found');
    }

    if (['completed', 'cancelled'].includes(receiving.status)) {
      throw new BadRequestException(`Cannot cancel receiving order with status: ${receiving.status}`);
    }

    const items = receiving.items as ReceivingItem[];
    const receivedItems = items.filter(item => item.receivedQuantity && item.receivedQuantity > 0);

    if (receivedItems.length > 0) {
      for (const item of receivedItems) {
        if (item.acceptedQuantity && item.acceptedQuantity > 0) {
          await this.db
            .update(inventory as any)
            .set({
              quantityOnHand: sql`${(inventory as any).quantityOnHand} - ${item.acceptedQuantity}`,
              quantityAvailable: sql`${(inventory as any).quantityAvailable} - ${item.acceptedQuantity}`,
            })
            .where(
              and(
                eq((inventory as any).productId, item.productId),
                eq((inventory as any).warehouseId, receiving.warehouseId),
              ),
            );
        }
      }
    }

    const [updated] = await this.db
      .update(receivingOrders)
      .set({
        status: 'cancelled',
        metadata: sql`COALESCE(${receivingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({
          cancelReason: reason,
          cancelledBy: userId,
          cancelledAt: new Date(),
          itemsRolledBack: receivedItems.length,
        })}::jsonb`,
      })
      .where(eq(receivingOrders.id, receivingId))
      .returning();

    await this.eventBus.emit('receiving.cancelled', {
      receivingId,
      receivingNumber: receiving.receivingNumber,
      reason,
      userId,
    });

    await this.invalidateCache(receiving.tenantId, receiving.warehouseId);

    this.logger.warn(`Receiving cancelled: ${receiving.receivingNumber}. Reason: ${reason}`);

    return updated;
  }

  async getReceivingMetrics(
    tenantId: string,
    warehouseId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ReceivingMetrics> {
    const receivings = await this.db
      .select()
      .from(receivingOrders)
      .where(
        and(
          eq(receivingOrders.tenantId, tenantId),
          eq(receivingOrders.warehouseId, warehouseId),
          gte(receivingOrders.expectedDate, startDate),
          lte(receivingOrders.expectedDate, endDate),
        ),
      );

    const completed = receivings.filter(r => r.status === 'completed');
    
    const processingTimes = completed
      .filter(r => r.receivedDate && r.completedAt)
      .map(r => {
        const start = new Date(r.receivedDate!).getTime();
        const end = new Date(r.completedAt!).getTime();
        return (end - start) / (1000 * 60);
      });

    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length
      : 0;

    let totalExpected = 0;
    let totalReceived = 0;
    let totalDamaged = 0;
    let onTimeCount = 0;
    let qualityPassCount = 0;
    let qualityTotalCount = 0;

    receivings.forEach(receiving => {
      const items = receiving.items as ReceivingItem[];
      items.forEach(item => {
        totalExpected += item.expectedQuantity;
        totalReceived += item.receivedQuantity || 0;
        totalDamaged += item.damagedQuantity || 0;

        if (item.qualityCheckStatus) {
          qualityTotalCount++;
          if (item.qualityCheckStatus === 'passed') {
            qualityPassCount++;
          }
        }
      });

      if (receiving.receivedDate) {
        const expected = new Date(receiving.expectedDate);
        const actual = new Date(receiving.receivedDate);
        if (actual <= expected) {
          onTimeCount++;
        }
      }
    });

    const accuracyRate = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;
    const onTimeRate = receivings.length > 0 ? (onTimeCount / receivings.length) * 100 : 0;
    const qualityPassRate = qualityTotalCount > 0 ? (qualityPassCount / qualityTotalCount) * 100 : 0;
    const damageRate = totalReceived > 0 ? (totalDamaged / totalReceived) * 100 : 0;

    return {
      totalReceivingOrders: receivings.length,
      completedOrders: completed.length,
      averageProcessingTime: parseFloat(averageProcessingTime.toFixed(2)),
      accuracyRate: parseFloat(accuracyRate.toFixed(2)),
      onTimeRate: parseFloat(onTimeRate.toFixed(2)),
      qualityPassRate: parseFloat(qualityPassRate.toFixed(2)),
      totalItemsReceived: totalReceived,
      totalDamageRate: parseFloat(damageRate.toFixed(2)),
    };
  }

  async scheduleReceiving(data: {
    tenantId: string;
    warehouseId: string;
    receivingId: string;
    scheduledDate: Date;
    dockNumber?: string;
    estimatedDuration?: number;
    specialRequirements?: string[];
  }): Promise<any> {
    await this.db
      .update(receivingOrders)
      .set({
        expectedDate: data.scheduledDate,
        metadata: sql`COALESCE(${receivingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({
          scheduled: true,
          scheduledDate: data.scheduledDate,
          dockNumber: data.dockNumber,
          estimatedDuration: data.estimatedDuration,
          specialRequirements: data.specialRequirements,
        })}::jsonb`,
      })
      .where(eq(receivingOrders.id, data.receivingId));

    await this.eventBus.emit('receiving.scheduled', {
      receivingId: data.receivingId,
      scheduledDate: data.scheduledDate,
      dockNumber: data.dockNumber,
    });

    return {
      receivingId: data.receivingId,
      scheduledDate: data.scheduledDate,
      dockNumber: data.dockNumber,
    };
  }

  async printReceivingLabel(receivingId: string, productId: string): Promise<{
    labelData: any;
    barcodeData: string;
    qrCodeData: string;
  }> {
    const [receiving] = await this.db
      .select()
      .from(receivingOrders)
      .where(eq(receivingOrders.id, receivingId))
      .limit(1);

    if (!receiving) {
      throw new NotFoundException('Receiving order not found');
    }

    const items = receiving.items as ReceivingItem[];
    const item = items.find(i => i.productId === productId);

    if (!item) {
      throw new NotFoundException('Product not found in receiving order');
    }

    const labelData = {
      receivingNumber: receiving.receivingNumber,
      productSku: item.productSku,
      productName: item.productName,
      quantity: item.receivedQuantity,
      location: item.location,
      lotNumber: item.lotNumber,
      expiryDate: item.expiryDate,
      receivedDate: receiving.receivedDate,
    };

    const barcodeData = `${item.productSku}-${item.lotNumber || 'NO-LOT'}`;
    const qrCodeData = JSON.stringify({
      type: 'receiving',
      receivingId,
      productId,
      lotNumber: item.lotNumber,
      timestamp: new Date(),
    });

    return {
      labelData,
      barcodeData,
      qrCodeData,
    };
  }

  async validateASN(asnData: {
    supplierCode: string;
    shipmentNumber: string;
    expectedDate: Date;
    items: Array<{
      productSku: string;
      quantity: number;
      lotNumber?: string;
    }>;
  }): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    matchedProducts: number;
    unmatchedProducts: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const unmatchedProducts: string[] = [];
    let matchedProducts = 0;

    if (!asnData.supplierCode || !asnData.shipmentNumber) {
      errors.push('Missing required fields: supplierCode or shipmentNumber');
    }

    if (asnData.expectedDate < new Date()) {
      warnings.push('Expected date is in the past');
    }

    for (const item of asnData.items) {
      const [product] = await this.db
        .select()
        .from(products)
        .where(eq(products.sku, item.productSku))
        .limit(1);

      if (product) {
        matchedProducts++;
      } else {
        unmatchedProducts.push(item.productSku);
        errors.push(`Product SKU not found: ${item.productSku}`);
      }

      if (item.quantity <= 0) {
        errors.push(`Invalid quantity for ${item.productSku}: ${item.quantity}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      matchedProducts,
      unmatchedProducts,
    };
  }

  async crossDockReceiving(data: {
    receivingId: string;
    outboundOrderId: string;
    productId: string;
    quantity: number;
    tempLocation: string;
    userId: string;
  }): Promise<any> {
    this.logger.log(`Cross-dock receiving: ${data.quantity} units for order ${data.outboundOrderId}`);

    await this.db.insert(inventory as any).values({
      productId: data.productId,
      location: data.tempLocation,
      quantityOnHand: data.quantity,
      quantityReserved: data.quantity,
      quantityAvailable: 0,
      metadata: {
        crossDock: true,
        receivingId: data.receivingId,
        outboundOrderId: data.outboundOrderId,
        temporaryLocation: true,
      },
    });

    await this.eventBus.emit('receiving.cross.dock', {
      receivingId: data.receivingId,
      outboundOrderId: data.outboundOrderId,
      productId: data.productId,
      quantity: data.quantity,
    });

    return {
      success: true,
      crossDock: true,
      message: 'Item marked for cross-docking',
    };
  }

  private async enrichReceivingItems(items: ReceivingItem[], tenantId: string): Promise<ReceivingItem[]> {
    const productIds = items.map(item => item.productId);
    
    const productRecords = await this.db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    return items.map(item => {
      const product = productRecords.find(p => p.id === item.productId);
      return {
        ...item,
        productSku: product?.sku,
        productName: product?.name,
        receivedQuantity: 0,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        damagedQuantity: 0,
        qualityCheckStatus: 'pending',
      };
    });
  }

  private async generateReceivingNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const [result] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(receivingOrders)
      .where(
        and(
          eq(receivingOrders.tenantId, tenantId),
          sql`DATE(${receivingOrders.createdAt}) = CURRENT_DATE`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `RCV-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;
  }

  private async invalidateCache(tenantId: string, warehouseId: string): Promise<void> {
    await this.cacheService.del(
      this.cacheService.generateKey('receiving', tenantId, warehouseId),
    );
    await this.cacheService.del(
      this.cacheService.generateKey('inventory', tenantId, warehouseId),
    );
  }
}


