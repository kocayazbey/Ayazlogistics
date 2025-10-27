import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, inArray, gte } from 'drizzle-orm';
import { 
  pickingOrders, 
  receivingOrders, 
  locations, 
  inventory,
  pallets,
  vehicles 
} from '../../../../database/schema/shared/wms.schema';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';
import { CacheService } from '../../common/services/cache.service';

interface PTEStatus {
  pteNumber: string;
  type: 'receiving' | 'picking' | 'transfer' | 'shipping';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignedTo: string;
  location: string;
  startTime: Date;
  estimatedCompletion: Date;
  progress: number;
}

interface PickingCartStatus {
  cartId: string;
  assignedPicker: string;
  currentLocation: string;
  orders: string[];
  itemsCollected: number;
  totalItems: number;
  status: 'active' | 'full' | 'checking' | 'shipping';
  lastUpdate: Date;
}

interface LocationStatus {
  locationId: string;
  locationCode: string;
  zone: string;
  type: 'pick' | 'storage' | 'receiving' | 'shipping' | 'waiting';
  status: 'available' | 'occupied' | 'blocked' | 'maintenance';
  occupancy: number;
  capacity: number;
  utilizationRate: number;
  currentPallets: number;
}

interface DockStatus {
  dockId: string;
  dockNumber: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  currentVehicle: string | null;
  currentOperation: 'loading' | 'unloading' | null;
  scheduledTime: Date | null;
  expectedCompletion: Date | null;
}

@Injectable()
export class RealTimeMonitoringService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly wsGateway: WebSocketGateway,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * PTE'leri İzleme (Pallet Transport Equipment)
   * Real-time tracking of all active warehouse operations
   */
  async monitorActivePTEs(warehouseId: string): Promise<PTEStatus[]> {
    const cacheKey = `pte:active:${warehouseId}`;
    const cached = await this.cacheService.get<PTEStatus[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const activePTEs: PTEStatus[] = [];

    // Monitor receiving operations
    const receivingOps = await this.db
      .select()
      .from(receivingOrders)
      .where(
        and(
          eq(receivingOrders.warehouseId, warehouseId),
          inArray(receivingOrders.status, ['pending', 'in_progress']),
        ),
      );

    for (const op of receivingOps) {
      activePTEs.push({
        pteNumber: op.receivingNumber,
        type: 'receiving',
        status: op.status as any,
        assignedTo: op.receivedBy || 'Unassigned',
        location: `Dock ${op.metadata?.dockNumber || 'TBD'}`,
        startTime: op.startedAt || op.createdAt,
        estimatedCompletion: this.calculateEstimatedCompletion(op),
        progress: this.calculateProgress(op),
      });
    }

    // Monitor picking operations
    const pickingOps = await this.db
      .select()
      .from(pickingOrders)
      .where(
        and(
          eq(pickingOrders.warehouseId, warehouseId),
          inArray(pickingOrders.status, ['pending', 'in_progress']),
        ),
      );

    for (const op of pickingOps) {
      activePTEs.push({
        pteNumber: op.pickingNumber,
        type: 'picking',
        status: op.status as any,
        assignedTo: op.assignedTo || 'Unassigned',
        location: `Zone ${op.metadata?.zone || 'Multiple'}`,
        startTime: op.startedAt || op.createdAt,
        estimatedCompletion: this.calculateEstimatedCompletion(op),
        progress: this.calculateProgress(op),
      });
    }

    await this.cacheService.set(cacheKey, activePTEs, 30);
    
    // Broadcast to WebSocket clients
    this.wsGateway.sendToRoom(`warehouse:${warehouseId}`, 'pte:status', activePTEs);

    return activePTEs;
  }

  /**
   * Toplama Arabaları Durumu İzleme
   * Track picking carts in real-time
   */
  async monitorPickingCarts(warehouseId: string): Promise<PickingCartStatus[]> {
    const cacheKey = `carts:${warehouseId}`;
    
    // Get active picking orders with cart assignments
    const activeOrders = await this.db
      .select()
      .from(pickingOrders)
      .where(
        and(
          eq(pickingOrders.warehouseId, warehouseId),
          eq(pickingOrders.status, 'in_progress'),
        ),
      );

    const carts: PickingCartStatus[] = [];

    for (const order of activeOrders) {
      const cartId = order.metadata?.cartId;
      if (!cartId) continue;

      const items = order.metadata?.items || [];
      const collected = items.filter((i: any) => i.picked).length;

      carts.push({
        cartId,
        assignedPicker: order.assignedTo,
        currentLocation: order.metadata?.currentLocation || 'Unknown',
        orders: [order.orderNumber],
        itemsCollected: collected,
        totalItems: items.length,
        status: this.determineCartStatus(collected, items.length),
        lastUpdate: order.updatedAt,
      });
    }

    this.wsGateway.sendToRoom(`warehouse:${warehouseId}`, 'carts:status', carts);

    return carts;
  }

  /**
   * Sevk Peronu İzleme
   * Monitor shipping docks status
   */
  async monitorShippingDocks(warehouseId: string): Promise<DockStatus[]> {
    // Mock implementation - would integrate with actual dock management system
    const docks: DockStatus[] = [
      {
        dockId: 'DOCK-001',
        dockNumber: '1',
        status: 'occupied',
        currentVehicle: '34ABC123',
        currentOperation: 'loading',
        scheduledTime: new Date(),
        expectedCompletion: new Date(Date.now() + 3600000),
      },
      {
        dockId: 'DOCK-002',
        dockNumber: '2',
        status: 'available',
        currentVehicle: null,
        currentOperation: null,
        scheduledTime: null,
        expectedCompletion: null,
      },
    ];

    this.wsGateway.sendToRoom(`warehouse:${warehouseId}`, 'docks:status', docks);

    return docks;
  }

  /**
   * Toplama Gözleri Durumu İzleme
   * Monitor pick face locations
   */
  async monitorPickFaces(warehouseId: string): Promise<LocationStatus[]> {
    const pickFaces = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, warehouseId),
          eq(locations.locationType, 'pick'),
        ),
      );

    const statuses: LocationStatus[] = [];

    for (const location of pickFaces) {
      const inventory = await this.db
        .select()
        .from(inventory)
        .where(eq(inventory.locationId, location.id));

      const totalQty = inventory.reduce((sum, inv) => sum + (inv.quantityOnHand || 0), 0);
      const capacity = parseFloat(location.capacity || '0');

      statuses.push({
        locationId: location.id,
        locationCode: location.code,
        zone: location.zone || 'N/A',
        type: location.locationType as any,
        status: this.determineLocationStatus(location, inventory),
        occupancy: totalQty,
        capacity,
        utilizationRate: capacity > 0 ? (totalQty / capacity) * 100 : 0,
        currentPallets: inventory.length,
      });
    }

    this.wsGateway.sendToRoom(`warehouse:${warehouseId}`, 'pickfaces:status', statuses);

    return statuses;
  }

  /**
   * İkmal Gözleri İzleme
   * Monitor replenishment needs
   */
  async monitorReplenishmentNeeds(warehouseId: string) {
    const pickFaces = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, warehouseId),
          eq(locations.locationType, 'pick'),
        ),
      );

    const replenishmentNeeded = [];

    for (const location of pickFaces) {
      const inv = await this.db
        .select()
        .from(inventory)
        .where(eq(inventory.locationId, location.id));

      const totalQty = inv.reduce((sum, i) => sum + (i.quantityAvailable || 0), 0);
      const minLevel = parseFloat(location.metadata?.minLevel || '10');

      if (totalQty < minLevel) {
        replenishmentNeeded.push({
          locationId: location.id,
          locationCode: location.code,
          zone: location.zone,
          currentLevel: totalQty,
          minLevel,
          urgency: totalQty === 0 ? 'critical' : totalQty < minLevel / 2 ? 'high' : 'medium',
          products: inv.map((i) => ({
            productId: i.productId,
            currentQty: i.quantityAvailable,
            neededQty: minLevel - (i.quantityAvailable || 0),
          })),
        });
      }
    }

    this.wsGateway.sendToRoom(`warehouse:${warehouseId}`, 'replenishment:needs', replenishmentNeeded);

    return {
      warehouseId,
      totalLocations: pickFaces.length,
      needingReplenishment: replenishmentNeeded.length,
      critical: replenishmentNeeded.filter((r) => r.urgency === 'critical').length,
      locations: replenishmentNeeded,
    };
  }

  /**
   * Depo Göz İstatistiği
   * Warehouse location statistics
   */
  async getWarehouseLocationStatistics(warehouseId: string) {
    const allLocations = await this.db
      .select()
      .from(locations)
      .where(eq(locations.warehouseId, warehouseId));

    const byZone = this.groupBy(allLocations, 'zone');
    const byType = this.groupBy(allLocations, 'locationType');
    const byStatus = allLocations.reduce(
      (acc, loc) => {
        const status = loc.isOccupied ? 'occupied' : loc.isLocked ? 'blocked' : 'available';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      warehouseId,
      totalLocations: allLocations.length,
      byZone: Object.entries(byZone).map(([zone, locs]) => ({
        zone,
        count: locs.length,
        occupied: locs.filter((l: any) => l.isOccupied).length,
        available: locs.filter((l: any) => !l.isOccupied && !l.isLocked).length,
      })),
      byType: Object.entries(byType).map(([type, locs]) => ({
        type,
        count: locs.length,
      })),
      byStatus,
      utilizationRate: allLocations.length > 0
        ? (byStatus.occupied / allLocations.length) * 100
        : 0,
    };
  }

  /**
   * Depoda Yer Bulamayan Paletleri İzleme
   * Monitor pallets without assigned locations
   */
  async monitorUnassignedPallets(warehouseId: string) {
    // Would track pallets in staging/waiting areas
    return {
      warehouseId,
      unassignedPallets: [],
      waitingCount: 0,
      oldestWaitTime: 0,
    };
  }

  /**
   * Dar Koridor Durumu İzleme
   * Monitor narrow aisle status
   */
  async monitorNarrowAisles(warehouseId: string) {
    // Would track VNA (Very Narrow Aisle) equipment and status
    return {
      warehouseId,
      narrowAisles: [],
      availableEquipment: 0,
      activeOperations: 0,
    };
  }

  /**
   * Bekleme Gözleri Durumu İzleme
   * Monitor staging/waiting locations
   */
  async monitorStagingAreas(warehouseId: string) {
    const stagingLocations = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, warehouseId),
          eq(locations.locationType, 'staging'),
        ),
      );

    const statuses = [];

    for (const location of stagingLocations) {
      const inv = await this.db
        .select()
        .from(inventory)
        .where(eq(inventory.locationId, location.id));

      statuses.push({
        locationCode: location.code,
        zone: location.zone,
        occupied: location.isOccupied,
        palletCount: inv.length,
        oldestPallet: inv.length > 0 
          ? Math.min(...inv.map((i) => i.createdAt?.getTime() || Date.now()))
          : null,
      });
    }

    return {
      warehouseId,
      totalStagingAreas: stagingLocations.length,
      occupied: statuses.filter((s) => s.occupied).length,
      locations: statuses,
    };
  }

  /**
   * Planlı Depo Giriş Durumu İzleme
   * Monitor planned receiving orders
   */
  async monitorPlannedReceiving(warehouseId: string) {
    const planned = await this.db
      .select()
      .from(receivingOrders)
      .where(
        and(
          eq(receivingOrders.warehouseId, warehouseId),
          eq(receivingOrders.status, 'pending'),
        ),
      );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      warehouseId,
      totalPlanned: planned.length,
      today: planned.filter((p) => p.expectedDate >= today && p.expectedDate < tomorrow).length,
      thisWeek: planned.filter((p) => {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return p.expectedDate >= today && p.expectedDate < weekEnd;
      }).length,
      overdue: planned.filter((p) => p.expectedDate < today).length,
      orders: planned.map((p) => ({
        receivingNumber: p.receivingNumber,
        supplier: p.supplier,
        expectedDate: p.expectedDate,
        poNumber: p.poNumber,
      })),
    };
  }

  /**
   * Çıkış Peronundaki Paletleri İzleme
   * Monitor pallets at shipping docks
   */
  async monitorShippingDockPallets(warehouseId: string) {
    const shippingLocations = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, warehouseId),
          eq(locations.locationType, 'shipping'),
        ),
      );

    const pallets = [];

    for (const location of shippingLocations) {
      const inv = await this.db
        .select()
        .from(inventory)
        .where(eq(inventory.locationId, location.id));

      for (const item of inv) {
        pallets.push({
          locationCode: location.code,
          productId: item.productId,
          quantity: item.quantityOnHand,
          waitTime: Date.now() - (item.createdAt?.getTime() || Date.now()),
          allocated: item.quantityAllocated > 0,
        });
      }
    }

    return {
      warehouseId,
      totalPallets: pallets.length,
      readyToShip: pallets.filter((p) => p.allocated).length,
      waiting: pallets.filter((p) => !p.allocated).length,
      pallets,
    };
  }

  /**
   * Girişteki Paletleri İzleme
   * Monitor pallets at receiving area
   */
  async monitorReceivingAreaPallets(warehouseId: string) {
    const receivingLocations = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, warehouseId),
          eq(locations.locationType, 'receiving'),
        ),
      );

    const pallets = [];

    for (const location of receivingLocations) {
      const inv = await this.db
        .select()
        .from(inventory)
        .where(eq(inventory.locationId, location.id));

      for (const item of inv) {
        pallets.push({
          locationCode: location.code,
          productId: item.productId,
          quantity: item.quantityOnHand,
          waitTime: Date.now() - (item.createdAt?.getTime() || Date.now()),
          needsPutaway: true,
        });
      }
    }

    return {
      warehouseId,
      totalPallets: pallets.length,
      avgWaitTime: pallets.length > 0 
        ? pallets.reduce((sum, p) => sum + p.waitTime, 0) / pallets.length / 60000
        : 0,
      oldestPallet: pallets.length > 0 
        ? Math.max(...pallets.map((p) => p.waitTime)) / 60000
        : 0,
      pallets,
    };
  }

  /**
   * Uyarı Mesajları İzleme
   * Monitor system alerts and warnings
   */
  async monitorAlerts(warehouseId: string) {
    const alerts = [];

    // Check for low stock alerts
    const lowStock = await this.checkLowStockAlerts(warehouseId);
    alerts.push(...lowStock);

    // Check for overdue tasks
    const overdueTasks = await this.checkOverdueTasks(warehouseId);
    alerts.push(...overdueTasks);

    // Check for blocked locations
    const blockedLocations = await this.checkBlockedLocations(warehouseId);
    alerts.push(...blockedLocations);

    // Broadcast alerts
    this.wsGateway.sendToRoom(`warehouse:${warehouseId}`, 'alerts', alerts);

    return {
      warehouseId,
      totalAlerts: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      warnings: alerts.filter((a) => a.severity === 'warning').length,
      alerts,
    };
  }

  /**
   * Manuel Beslenecek Toplama Gözlerini İzleme
   * Monitor pick faces needing manual replenishment
   */
  async monitorManualReplenishment(warehouseId: string) {
    const replenishmentNeeds = await this.monitorReplenishmentNeeds(warehouseId);
    
    const manualOnly = replenishmentNeeds.locations.filter(
      (loc: any) => loc.urgency === 'critical' || loc.urgency === 'high',
    );

    return {
      warehouseId,
      totalNeeded: manualOnly.length,
      critical: manualOnly.filter((m: any) => m.urgency === 'critical').length,
      locations: manualOnly,
    };
  }

  // Helper methods
  private calculateEstimatedCompletion(operation: any): Date {
    const avgDuration = 30; // minutes
    const started = operation.startedAt || operation.createdAt;
    return new Date(started.getTime() + avgDuration * 60000);
  }

  private calculateProgress(operation: any): number {
    if (operation.status === 'completed') return 100;
    if (operation.status === 'pending') return 0;
    
    const items = operation.metadata?.items || [];
    if (items.length === 0) return 0;
    
    const completed = items.filter((i: any) => i.completed || i.picked).length;
    return (completed / items.length) * 100;
  }

  private determineCartStatus(collected: number, total: number): PickingCartStatus['status'] {
    if (collected === 0) return 'active';
    if (collected >= total) return 'checking';
    if (collected / total > 0.8) return 'full';
    return 'active';
  }

  private determineLocationStatus(location: any, inventory: any[]): LocationStatus['status'] {
    if (location.isLocked) return 'blocked';
    if (location.metadata?.maintenance) return 'maintenance';
    if (inventory.length > 0) return 'occupied';
    return 'available';
  }

  private async checkLowStockAlerts(warehouseId: string) {
    // Implementation for low stock alerts
    return [];
  }

  private async checkOverdueTasks(warehouseId: string) {
    // Implementation for overdue tasks
    return [];
  }

  private async checkBlockedLocations(warehouseId: string) {
    const blocked = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, warehouseId),
          eq(locations.isLocked, true),
        ),
      );

    return blocked.map((loc) => ({
      severity: 'warning',
      type: 'blocked_location',
      message: `Location ${loc.code} is blocked`,
      locationId: loc.id,
      timestamp: new Date(),
    }));
  }

  private groupBy(array: any[], key: string) {
    return array.reduce((result, item) => {
      const group = item[key] || 'Unknown';
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {});
  }

  /**
   * Get comprehensive warehouse dashboard
   */
  async getWarehouseDashboard(warehouseId: string) {
    const [
      ptes,
      carts,
      docks,
      pickFaces,
      replenishment,
      statistics,
      alerts,
    ] = await Promise.all([
      this.monitorActivePTEs(warehouseId),
      this.monitorPickingCarts(warehouseId),
      this.monitorShippingDocks(warehouseId),
      this.monitorPickFaces(warehouseId),
      this.monitorReplenishmentNeeds(warehouseId),
      this.getWarehouseLocationStatistics(warehouseId),
      this.monitorAlerts(warehouseId),
    ]);

    return {
      warehouseId,
      timestamp: new Date(),
      operations: {
        activePTEs: ptes.length,
        activeCarts: carts.length,
      },
      docks: {
        total: docks.length,
        occupied: docks.filter((d) => d.status === 'occupied').length,
        available: docks.filter((d) => d.status === 'available').length,
      },
      locations: statistics,
      replenishment: {
        total: replenishment.needingReplenishment,
        critical: replenishment.critical,
      },
      alerts: {
        total: alerts.totalAlerts,
        critical: alerts.critical,
      },
      ptes,
      carts,
      pickFaces: pickFaces.slice(0, 20),
      recentAlerts: alerts.alerts.slice(0, 10),
    };
  }
}

