import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, inArray, gte, lte } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { pickingOrders, inventory, products, warehouses } from '../../../../database/schema/shared/wms.schema';
import { InsufficientStockException, InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

interface PickingItem {
  productId: string;
  productSku?: string;
  productName?: string;
  quantity: number;
  pickedQuantity?: number;
  shortQuantity?: number;
  preferredLocation?: string;
  allocatedLocations?: PickingLocation[];
  pickingNotes?: string;
  serialNumbers?: string[];
}

interface PickingLocation {
  location: string;
  zone: string;
  quantity: number;
  lotNumber?: string;
  expiryDate?: Date;
  distance: number;
}

interface PickingMetrics {
  totalPickingOrders: number;
  completedOrders: number;
  averagePickTime: number;
  accuracyRate: number;
  productivityRate: number;
  errorRate: number;
}

interface WavePickingBatch {
  waveId: string;
  pickingOrders: string[];
  totalItems: number;
  totalQuantity: number;
  status: 'pending' | 'in_progress' | 'completed';
  assignedPickers: string[];
  estimatedTime: number;
}

@Injectable()
export class PickingImplementationService {
  private readonly logger = new Logger(PickingImplementationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  async createPickingOrder(data: {
    tenantId: string;
    warehouseId: string;
    orderId: string;
    orderNumber: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    pickingStrategy: 'fifo' | 'fefo' | 'zone' | 'batch' | 'wave';
    items: PickingItem[];
    createdBy: string;
    shipByDate?: Date;
    customerName?: string;
  }): Promise<any> {
    this.logger.log(`Creating picking order for order ${data.orderNumber}`);

    const pickingNumber = await this.generatePickingNumber(data.tenantId);

    for (const item of data.items) {
      const [inventoryCheck] = await this.db
        .select({
          total: sql<number>`SUM(${inventory.quantityAvailable})`,
        })
        .from(inventory)
        .where(
          and(
            eq(inventory.tenantId, data.tenantId),
            eq(inventory.warehouseId, data.warehouseId),
            eq(inventory.productId, item.productId),
          ),
        );

      if (!inventoryCheck.total || inventoryCheck.total < item.quantity) {
        throw new InsufficientStockException(
          item.productId,
          inventoryCheck.total || 0,
          item.quantity,
        );
      }
    }

    const enrichedItems = await this.enrichPickingItems(data.items, data.tenantId);

    const allocatedItems = await this.allocateInventoryForPicking(
      enrichedItems,
      data.warehouseId,
      data.pickingStrategy,
    );

    const totalQuantity = allocatedItems.reduce((sum, item) => sum + item.quantity, 0);

    const [picking] = await this.db.insert(pickingOrders).values({
      tenantId: data.tenantId,
      warehouseId: data.warehouseId,
      pickingNumber,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      pickingType: 'standard',
      priority: data.priority,
      pickingStrategy: data.pickingStrategy,
      status: 'pending',
      items: allocatedItems as any,
      createdBy: data.createdBy,
      metadata: {
        shipByDate: data.shipByDate,
        customerName: data.customerName,
        totalQuantity,
        itemCount: allocatedItems.length,
      },
    }).returning();

    for (const item of allocatedItems) {
      if (item.allocatedLocations) {
        for (const location of item.allocatedLocations) {
          await this.db
            .update(inventory)
            .set({
              quantityReserved: sql`${inventory.quantityReserved} + ${location.quantity}`,
              quantityAvailable: sql`${inventory.quantityAvailable} - ${location.quantity}`,
            })
            .where(
              and(
                eq(inventory.productId, item.productId),
                eq(inventory.warehouseId, data.warehouseId),
                eq(inventory.location, location.location),
              ),
            );
        }
      }
    }

    await this.eventBus.emit('picking.order.created', {
      pickingId: picking.id,
      pickingNumber,
      orderNumber: data.orderNumber,
      itemCount: allocatedItems.length,
      totalQuantity,
      priority: data.priority,
    });

    await this.invalidateCache(data.tenantId, data.warehouseId);

    this.logger.log(`Picking order created: ${pickingNumber}`);

    return picking;
  }

  async assignPicker(pickingId: string, pickerId: string, estimatedTime?: number): Promise<any> {
    const [picking] = await this.db
      .select()
      .from(pickingOrders)
      .where(eq(pickingOrders.id, pickingId))
      .limit(1);

    if (!picking) {
      throw new NotFoundException('Picking order not found');
    }

    if (picking.status !== 'pending') {
      throw new InvalidStateTransitionException(
        'PickingOrder',
        picking.status,
        'assigned',
      );
    }

    const [updated] = await this.db
      .update(pickingOrders)
      .set({
        status: 'assigned',
        assignedTo: pickerId,
        assignedAt: new Date(),
        metadata: sql`COALESCE(${pickingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({
          estimatedPickTime: estimatedTime,
        })}::jsonb`,
      })
      .where(eq(pickingOrders.id, pickingId))
      .returning();

    await this.eventBus.emit('picking.assigned', {
      pickingId,
      pickingNumber: picking.pickingNumber,
      pickerId,
    });

    this.logger.log(`Picking ${picking.pickingNumber} assigned to picker ${pickerId}`);

    return updated;
  }

  async startPicking(pickingId: string, pickerId: string): Promise<any> {
    const [picking] = await this.db
      .select()
      .from(pickingOrders)
      .where(eq(pickingOrders.id, pickingId))
      .limit(1);

    if (!picking) {
      throw new NotFoundException('Picking order not found');
    }

    if (picking.status !== 'assigned') {
      throw new InvalidStateTransitionException(
        'PickingOrder',
        picking.status,
        'in_progress',
      );
    }

    const [updated] = await this.db
      .update(pickingOrders)
      .set({
        status: 'in_progress',
        pickedBy: pickerId,
        startedAt: new Date(),
      })
      .where(eq(pickingOrders.id, pickingId))
      .returning();

    await this.eventBus.emit('picking.started', {
      pickingId,
      pickingNumber: picking.pickingNumber,
      pickerId,
      startTime: new Date(),
    });

    this.logger.log(`Picking started: ${picking.pickingNumber} by ${pickerId}`);

    return updated;
  }

  async pickItem(data: {
    pickingId: string;
    productId: string;
    pickedQuantity: number;
    location: string;
    lotNumber?: string;
    serialNumbers?: string[];
    shortQuantity?: number;
    shortReason?: string;
    pickerId: string;
  }): Promise<any> {
    this.logger.debug(`Picking item ${data.productId} from ${data.location}, quantity: ${data.pickedQuantity}`);

    const [picking] = await this.db
      .select()
      .from(pickingOrders)
      .where(eq(pickingOrders.id, data.pickingId))
      .limit(1);

    if (!picking) {
      throw new NotFoundException('Picking order not found');
    }

    if (picking.status !== 'in_progress') {
      throw new BadRequestException('Picking order is not in progress');
    }

    await this.db
      .update(inventory)
      .set({
        quantityReserved: sql`${inventory.quantityReserved} - ${data.pickedQuantity}`,
        quantityOnHand: sql`${inventory.quantityOnHand} - ${data.pickedQuantity}`,
        metadata: sql`COALESCE(${inventory.metadata}, '{}'::jsonb) || ${JSON.stringify({
          lastPicked: new Date(),
          lastPickedBy: data.pickerId,
        })}::jsonb`,
      })
      .where(
        and(
          eq(inventory.productId, data.productId),
          eq(inventory.location, data.location),
        ),
      );

    const items = picking.items as PickingItem[];
    const updatedItems = items.map(item => {
      if (item.productId === data.productId) {
        return {
          ...item,
          pickedQuantity: (item.pickedQuantity || 0) + data.pickedQuantity,
          shortQuantity: data.shortQuantity,
          pickingNotes: data.shortReason,
          serialNumbers: data.serialNumbers,
        };
      }
      return item;
    });

    await this.db
      .update(pickingOrders)
      .set({
        items: updatedItems as any,
        metadata: sql`COALESCE(${pickingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({
          lastItemPicked: new Date(),
          totalPickedSoFar: updatedItems.reduce((sum, item) => sum + (item.pickedQuantity || 0), 0),
        })}::jsonb`,
      })
      .where(eq(pickingOrders.id, data.pickingId));

    if (data.shortQuantity && data.shortQuantity > 0) {
      await this.eventBus.emit('picking.short.reported', {
        pickingId: data.pickingId,
        productId: data.productId,
        shortQuantity: data.shortQuantity,
        reason: data.shortReason,
      });

      this.logger.warn(
        `Short pick reported: ${data.shortQuantity} units of ${data.productId}. Reason: ${data.shortReason}`,
      );
    }

    await this.eventBus.emit('picking.item.picked', {
      pickingId: data.pickingId,
      productId: data.productId,
      pickedQuantity: data.pickedQuantity,
      location: data.location,
      lotNumber: data.lotNumber,
    });

    await this.invalidateCache(picking.tenantId, picking.warehouseId);

    return {
      pickingId: data.pickingId,
      productId: data.productId,
      pickedQuantity: data.pickedQuantity,
      shortQuantity: data.shortQuantity || 0,
      location: data.location,
      lotNumber: data.lotNumber,
      serialNumbers: data.serialNumbers,
      timestamp: new Date(),
    };
  }

  async completePicking(pickingId: string, userId: string): Promise<any> {
    const [picking] = await this.db
      .select()
      .from(pickingOrders)
      .where(eq(pickingOrders.id, pickingId))
      .limit(1);

    if (!picking) {
      throw new NotFoundException('Picking order not found');
    }

    if (picking.status !== 'in_progress') {
      throw new InvalidStateTransitionException(
        'PickingOrder',
        picking.status,
        'completed',
      );
    }

    const items = picking.items as PickingItem[];
    const totalExpected = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPicked = items.reduce((sum, item) => sum + (item.pickedQuantity || 0), 0);
    const totalShort = items.reduce((sum, item) => sum + (item.shortQuantity || 0), 0);

    const accuracyRate = totalExpected > 0 ? (totalPicked / totalExpected) * 100 : 0;
    const pickTime = picking.startedAt
      ? (new Date().getTime() - new Date(picking.startedAt).getTime()) / (1000 * 60)
      : 0;
    const productivity = pickTime > 0 ? totalPicked / pickTime : 0;

    const completionMetrics = {
      totalExpected,
      totalPicked,
      totalShort,
      accuracyRate: parseFloat(accuracyRate.toFixed(2)),
      pickTime: parseFloat(pickTime.toFixed(2)),
      productivityRate: parseFloat(productivity.toFixed(2)),
      completedAt: new Date(),
      completedBy: userId,
    };

    const [updated] = await this.db
      .update(pickingOrders)
      .set({
        status: 'completed',
        completedAt: new Date(),
        completedBy: userId,
        metadata: sql`COALESCE(${pickingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify(completionMetrics)}::jsonb`,
      })
      .where(eq(pickingOrders.id, pickingId))
      .returning();

    await this.eventBus.emit('picking.completed', {
      pickingId,
      pickingNumber: picking.pickingNumber,
      userId,
      metrics: completionMetrics,
    });

    await this.invalidateCache(picking.tenantId, picking.warehouseId);

    this.logger.log(
      `Picking completed: ${picking.pickingNumber}. Accuracy: ${accuracyRate.toFixed(2)}%, Time: ${pickTime.toFixed(2)} min, Productivity: ${productivity.toFixed(2)} units/min`,
    );

    return updated;
  }

  async getPickingOrders(tenantId: string, filters?: {
    warehouseId?: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    let conditions = [eq(pickingOrders.tenantId, tenantId)];

    if (filters?.warehouseId) {
      conditions.push(eq(pickingOrders.warehouseId, filters.warehouseId));
    }

    if (filters?.status) {
      conditions.push(eq(pickingOrders.status, filters.status));
    }

    if (filters?.priority) {
      conditions.push(eq(pickingOrders.priority, filters.priority));
    }

    if (filters?.assignedTo) {
      conditions.push(eq(pickingOrders.assignedTo, filters.assignedTo));
    }

    if (filters?.startDate) {
      conditions.push(gte(pickingOrders.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(pickingOrders.createdAt, filters.endDate));
    }

    const query = conditions.length > 1
      ? this.db.select().from(pickingOrders).where(and(...conditions))
      : this.db.select().from(pickingOrders).where(conditions[0]);

    return await query;
  }

  async optimizePickingRoute(pickingId: string): Promise<{
    pickingId: string;
    optimizedRoute: Array<{
      sequence: number;
      productId: string;
      productSku: string;
      location: string;
      zone: string;
      quantity: number;
      distance: number;
      cumulativeDistance: number;
    }>;
    totalDistance: number;
    estimatedTime: number;
    savings: {
      distanceReduction: number;
      timeReduction: number;
    };
  }> {
    const [picking] = await this.db
      .select()
      .from(pickingOrders)
      .where(eq(pickingOrders.id, pickingId))
      .limit(1);

    if (!picking) {
      throw new NotFoundException('Picking order not found');
    }

    const items = picking.items as PickingItem[];

    const locationData = [
      { location: 'A-01-01', zone: 'A', x: 0, y: 0 },
      { location: 'A-01-02', zone: 'A', x: 5, y: 0 },
      { location: 'A-02-01', zone: 'A', x: 0, y: 10 },
      { location: 'B-01-01', zone: 'B', x: 20, y: 0 },
      { location: 'B-02-01', zone: 'B', x: 20, y: 10 },
    ];

    const pickingStops = items.flatMap(item => 
      item.allocatedLocations?.map(loc => ({
        productId: item.productId,
        productSku: item.productSku || '',
        location: loc.location,
        quantity: loc.quantity,
      })) || []
    );

    const sortedStops = this.sortPickingStopsByZone(pickingStops, locationData);

    let cumulativeDistance = 0;
    const optimizedRoute = sortedStops.map((stop, idx) => {
      const locData = locationData.find(l => l.location === stop.location);
      const prevLoc = idx > 0 ? locationData.find(l => l.location === sortedStops[idx - 1].location) : { x: 0, y: 0 };
      
      const distance = Math.sqrt(
        Math.pow((locData?.x || 0) - (prevLoc?.x || 0), 2) +
        Math.pow((locData?.y || 0) - (prevLoc?.y || 0), 2)
      );

      cumulativeDistance += distance;

      return {
        sequence: idx + 1,
        productId: stop.productId,
        productSku: stop.productSku,
        location: stop.location,
        zone: locData?.zone || 'Unknown',
        quantity: stop.quantity,
        distance: parseFloat(distance.toFixed(2)),
        cumulativeDistance: parseFloat(cumulativeDistance.toFixed(2)),
      };
    });

    const totalDistance = cumulativeDistance;
    const estimatedTime = Math.ceil((totalDistance * 0.5) + (sortedStops.length * 2));

    const unoptimizedDistance = pickingStops.length * 15;
    const distanceReduction = unoptimizedDistance - totalDistance;
    const timeReduction = (distanceReduction * 0.5) + (pickingStops.length * 0.3);

    await this.db
      .update(pickingOrders)
      .set({
        metadata: sql`COALESCE(${pickingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({
          optimizedRoute: optimizedRoute,
          totalDistance,
          estimatedTime,
        })}::jsonb`,
      })
      .where(eq(pickingOrders.id, pickingId));

    return {
      pickingId,
      optimizedRoute,
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      estimatedTime,
      savings: {
        distanceReduction: parseFloat(distanceReduction.toFixed(2)),
        timeReduction: parseFloat(timeReduction.toFixed(2)),
      },
    };
  }

  async batchPickingOrders(
    warehouseId: string,
    pickingIds: string[],
    assignedPickers?: string[],
  ): Promise<WavePickingBatch> {
    this.logger.log(`Creating batch for ${pickingIds.length} picking orders`);

    const pickings = await this.db
      .select()
      .from(pickingOrders)
      .where(
        and(
          inArray(pickingOrders.id, pickingIds),
          eq(pickingOrders.warehouseId, warehouseId),
          eq(pickingOrders.status, 'pending'),
        ),
      );

    if (pickings.length !== pickingIds.length) {
      throw new BadRequestException('Some picking orders are not available for batching');
    }

    const consolidatedItems = new Map<string, { totalQuantity: number; locations: Set<string> }>();

    let totalItems = 0;
    let totalQuantity = 0;

    pickings.forEach((picking) => {
      const items = picking.items as PickingItem[];
      totalItems += items.length;
      
      items.forEach((item) => {
        totalQuantity += item.quantity;
        
        const existing = consolidatedItems.get(item.productId) || {
          totalQuantity: 0,
          locations: new Set<string>(),
        };
        existing.totalQuantity += item.quantity;
        
        item.allocatedLocations?.forEach(loc => {
          existing.locations.add(loc.location);
        });
        
        consolidatedItems.set(item.productId, existing);
      });
    });

    const waveId = `WAVE-${Date.now()}`;
    const estimatedTime = Math.ceil(totalItems * 2.5);

    await this.db
      .update(pickingOrders)
      .set({
        metadata: sql`COALESCE(${pickingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({
          waveId,
          batchPicking: true,
        })}::jsonb`,
      })
      .where(inArray(pickingOrders.id, pickingIds));

    const wave: WavePickingBatch = {
      waveId,
      pickingOrders: pickingIds,
      totalItems,
      totalQuantity,
      status: 'pending',
      assignedPickers: assignedPickers || [],
      estimatedTime,
    };

    await this.eventBus.emit('wave.picking.created', {
      waveId,
      pickingOrderCount: pickingIds.length,
      totalItems,
      totalQuantity,
    });

    this.logger.log(`Wave picking batch created: ${waveId} with ${pickingIds.length} orders`);

    return wave;
  }

  async getPickingMetrics(
    tenantId: string,
    warehouseId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PickingMetrics> {
    const pickings = await this.db
      .select()
      .from(pickingOrders)
      .where(
        and(
          eq(pickingOrders.tenantId, tenantId),
          eq(pickingOrders.warehouseId, warehouseId),
          gte(pickingOrders.createdAt, startDate),
          lte(pickingOrders.createdAt, endDate),
        ),
      );

    const completed = pickings.filter(p => p.status === 'completed');

    const pickTimes = completed
      .filter(p => p.startedAt && p.completedAt)
      .map(p => {
        const start = new Date(p.startedAt!).getTime();
        const end = new Date(p.completedAt!).getTime();
        return (end - start) / (1000 * 60);
      });

    const averagePickTime = pickTimes.length > 0
      ? pickTimes.reduce((sum, t) => sum + t, 0) / pickTimes.length
      : 0;

    let totalExpected = 0;
    let totalPicked = 0;
    let totalShort = 0;
    let totalErrors = 0;

    pickings.forEach(picking => {
      const items = picking.items as PickingItem[];
      items.forEach(item => {
        totalExpected += item.quantity;
        totalPicked += item.pickedQuantity || 0;
        totalShort += item.shortQuantity || 0;
        if (item.shortQuantity && item.shortQuantity > 0) {
          totalErrors++;
        }
      });
    });

    const accuracyRate = totalExpected > 0 ? (totalPicked / totalExpected) * 100 : 0;
    const errorRate = pickings.length > 0 ? (totalErrors / pickings.length) * 100 : 0;
    const productivityRate = averagePickTime > 0 ? totalPicked / (averagePickTime * completed.length) : 0;

    return {
      totalPickingOrders: pickings.length,
      completedOrders: completed.length,
      averagePickTime: parseFloat(averagePickTime.toFixed(2)),
      accuracyRate: parseFloat(accuracyRate.toFixed(2)),
      productivityRate: parseFloat(productivityRate.toFixed(2)),
      errorRate: parseFloat(errorRate.toFixed(2)),
    };
  }

  async verifyPicking(pickingId: string, verifiedBy: string): Promise<any> {
    const [picking] = await this.db
      .select()
      .from(pickingOrders)
      .where(eq(pickingOrders.id, pickingId))
      .limit(1);

    if (!picking || picking.status !== 'completed') {
      throw new BadRequestException('Picking order must be completed before verification');
    }

    await this.db
      .update(pickingOrders)
      .set({
        metadata: sql`COALESCE(${pickingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({
          verified: true,
          verifiedBy,
          verifiedAt: new Date(),
        })}::jsonb`,
      })
      .where(eq(pickingOrders.id, pickingId));

    await this.eventBus.emit('picking.verified', {
      pickingId,
      verifiedBy,
    });

    return { success: true, message: 'Picking order verified' };
  }

  private async allocateInventoryForPicking(
    items: PickingItem[],
    warehouseId: string,
    strategy: string,
  ): Promise<PickingItem[]> {
    const allocated: PickingItem[] = [];

    for (const item of items) {
      const locations = await this.findInventoryLocations(
        item.productId,
        warehouseId,
        item.quantity,
        strategy,
      );

      allocated.push({
        ...item,
        allocatedLocations: locations,
      });
    }

    return allocated;
  }

  private async findInventoryLocations(
    productId: string,
    warehouseId: string,
    quantity: number,
    strategy: string,
  ): Promise<PickingLocation[]> {
    const mockLocations: PickingLocation[] = [
      {
        location: 'A-01-01',
        zone: 'Fast Moving',
        quantity: Math.min(quantity, 50),
        lotNumber: 'LOT-001',
        distance: 10,
      },
      {
        location: 'A-01-02',
        zone: 'Fast Moving',
        quantity: Math.min(Math.max(0, quantity - 50), 50),
        lotNumber: 'LOT-002',
        distance: 15,
      },
    ];

    return mockLocations.filter(loc => loc.quantity > 0);
  }

  private sortPickingStopsByZone(stops: any[], locationData: any[]): any[] {
    const zoneGroups = new Map<string, any[]>();

    stops.forEach(stop => {
      const locData = locationData.find(l => l.location === stop.location);
      const zone = locData?.zone || 'Unknown';
      
      if (!zoneGroups.has(zone)) {
        zoneGroups.set(zone, []);
      }
      zoneGroups.get(zone)!.push(stop);
    });

    const sorted: any[] = [];
    zoneGroups.forEach((zoneStops, zone) => {
      zoneStops.sort((a, b) => a.location.localeCompare(b.location));
      sorted.push(...zoneStops);
    });

    return sorted;
  }

  private async enrichPickingItems(items: PickingItem[], tenantId: string): Promise<PickingItem[]> {
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
        pickedQuantity: 0,
        shortQuantity: 0,
      };
    });
  }

  private async generatePickingNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const [result] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(pickingOrders)
      .where(
        and(
          eq(pickingOrders.tenantId, tenantId),
          sql`DATE(${pickingOrders.createdAt}) = CURRENT_DATE`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `PICK-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;
  }

  private async invalidateCache(tenantId: string, warehouseId: string): Promise<void> {
    await this.cacheService.del(
      this.cacheService.generateKey('picking', tenantId, warehouseId),
    );
    await this.cacheService.del(
      this.cacheService.generateKey('inventory', tenantId, warehouseId),
    );
  }
}

