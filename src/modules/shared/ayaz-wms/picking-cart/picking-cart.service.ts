import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, inArray } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';

/**
 * Toplama Arabası Yönetimi
 * Picking Cart Management Service - Missing in AyazWMS
 */
@Injectable()
export class PickingCartService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly wsGateway: WebSocketGateway,
  ) {}

  /**
   * Toplama Arabası Sorgulama
   * Query picking cart status and contents
   */
  async queryCart(cartId: string, warehouseId: string) {
    // Mock implementation - would have carts table
    const cart = {
      cartId,
      warehouseId,
      assignedPicker: null,
      status: 'available',
      capacity: 50,
      currentLoad: 0,
      orders: [],
      items: [],
      lastLocation: null,
      lastUpdate: new Date(),
    };

    await this.eventBus.emit('cart.queried', { cartId, warehouseId });

    return cart;
  }

  /**
   * Toplama Arabası Aktarma
   * Transfer items between picking carts
   */
  async transferCart(data: {
    fromCartId: string;
    toCartId: string;
    items: Array<{
      productId: string;
      quantity: number;
    }>;
    warehouseId: string;
  }, userId: string) {
    // Validate source cart
    const fromCart = await this.queryCart(data.fromCartId, data.warehouseId);
    
    if (fromCart.status !== 'active') {
      throw new BadRequestException('Source cart is not active');
    }

    // Validate destination cart
    const toCart = await this.queryCart(data.toCartId, data.warehouseId);
    
    if (toCart.status === 'full') {
      throw new BadRequestException('Destination cart is full');
    }

    const transferId = `TRF-${Date.now()}`;

    await this.eventBus.emit('cart.transfer', {
      transferId,
      fromCart: data.fromCartId,
      toCart: data.toCartId,
      itemCount: data.items.length,
      userId,
    });

    this.wsGateway.sendToRoom(`warehouse:${data.warehouseId}`, 'cart:transfer', {
      transferId,
      fromCart: data.fromCartId,
      toCart: data.toCartId,
    });

    return {
      transferId,
      status: 'completed',
      transferredItems: data.items.length,
      timestamp: new Date(),
    };
  }

  /**
   * Toplama Arabası Birleştirme
   * Merge multiple carts into one
   */
  async mergeCarts(data: {
    cartIds: string[];
    targetCartId: string;
    warehouseId: string;
  }, userId: string) {
    if (data.cartIds.length < 2) {
      throw new BadRequestException('At least 2 carts required for merging');
    }

    const mergeId = `MERGE-${Date.now()}`;

    await this.eventBus.emit('carts.merged', {
      mergeId,
      sourceCarts: data.cartIds,
      targetCart: data.targetCartId,
      userId,
    });

    return {
      mergeId,
      status: 'completed',
      mergedCarts: data.cartIds.length,
      targetCart: data.targetCartId,
      timestamp: new Date(),
    };
  }

  /**
   * Toplama Arabası Yükleme
   * Load cart onto vehicle for shipping
   */
  async loadCartToVehicle(data: {
    cartId: string;
    vehicleId: string;
    dockNumber: string;
    warehouseId: string;
  }, userId: string) {
    const cart = await this.queryCart(data.cartId, data.warehouseId);

    if (cart.status !== 'full' && cart.status !== 'checking') {
      throw new BadRequestException('Cart must be full or checked before loading');
    }

    const loadId = `LOAD-${Date.now()}`;

    await this.eventBus.emit('cart.loaded', {
      loadId,
      cartId: data.cartId,
      vehicleId: data.vehicleId,
      dockNumber: data.dockNumber,
      userId,
    });

    this.wsGateway.sendToRoom(`warehouse:${data.warehouseId}`, 'cart:loaded', {
      cartId: data.cartId,
      vehicleId: data.vehicleId,
      dockNumber: data.dockNumber,
    });

    return {
      loadId,
      status: 'loaded',
      cartId: data.cartId,
      vehicleId: data.vehicleId,
      dockNumber: data.dockNumber,
      timestamp: new Date(),
    };
  }

  /**
   * Toplama Arabası Son Kontrol
   * Final check before shipping
   */
  async performFinalCheck(data: {
    cartId: string;
    orderNumbers: string[];
    checkItems: Array<{
      productId: string;
      expectedQuantity: number;
      actualQuantity: number;
    }>;
    warehouseId: string;
  }, userId: string) {
    const discrepancies = data.checkItems.filter(
      (item) => item.expectedQuantity !== item.actualQuantity,
    );

    const checkId = `CHECK-${Date.now()}`;
    const passed = discrepancies.length === 0;

    await this.eventBus.emit('cart.final.check', {
      checkId,
      cartId: data.cartId,
      passed,
      discrepancyCount: discrepancies.length,
      userId,
    });

    return {
      checkId,
      cartId: data.cartId,
      passed,
      totalItems: data.checkItems.length,
      discrepancies,
      status: passed ? 'approved' : 'review_required',
      checkedBy: userId,
      timestamp: new Date(),
    };
  }

  /**
   * Toplama Gözü Otomatik Sayım
   * Auto-count items in pick face when cart visits
   */
  async autoCountPickFace(data: {
    cartId: string;
    locationId: string;
    scannedItems: Array<{
      productId: string;
      quantity: number;
    }>;
    warehouseId: string;
  }, userId: string) {
    const countId = `AUTO-COUNT-${Date.now()}`;

    // Get system inventory for location
    const systemInv = await this.db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.warehouseId, data.warehouseId),
          eq(inventory.locationId, data.locationId),
        ),
      );

    const discrepancies = [];

    for (const scanned of data.scannedItems) {
      const system = systemInv.find((inv) => inv.productId === scanned.productId);
      const systemQty = system?.quantityOnHand || 0;

      if (systemQty !== scanned.quantity) {
        discrepancies.push({
          productId: scanned.productId,
          systemQuantity: systemQty,
          scannedQuantity: scanned.quantity,
          variance: scanned.quantity - systemQty,
        });
      }
    }

    await this.eventBus.emit('pickface.auto.counted', {
      countId,
      locationId: data.locationId,
      cartId: data.cartId,
      hasDiscrepancies: discrepancies.length > 0,
    });

    return {
      countId,
      locationId: data.locationId,
      totalItems: data.scannedItems.length,
      discrepancies,
      accuracy: discrepancies.length === 0 
        ? 100 
        : ((data.scannedItems.length - discrepancies.length) / data.scannedItems.length) * 100,
      requiresAdjustment: discrepancies.length > 0,
      timestamp: new Date(),
    };
  }

  /**
   * Assign cart to picker
   */
  async assignCart(cartId: string, pickerId: string, warehouseId: string) {
    await this.eventBus.emit('cart.assigned', {
      cartId,
      pickerId,
      warehouseId,
    });

    this.wsGateway.sendToRoom(`warehouse:${warehouseId}`, 'cart:assigned', {
      cartId,
      pickerId,
    });

    return {
      cartId,
      assignedTo: pickerId,
      assignedAt: new Date(),
    };
  }

  /**
   * Release cart after use
   */
  async releaseCart(cartId: string, warehouseId: string, userId: string) {
    await this.eventBus.emit('cart.released', {
      cartId,
      warehouseId,
      userId,
    });

    return {
      cartId,
      status: 'available',
      releasedAt: new Date(),
    };
  }

  /**
   * Get all available carts
   */
  async getAvailableCarts(warehouseId: string) {
    // Mock - would query carts table
    return {
      warehouseId,
      availableCarts: [],
      totalCarts: 0,
      inUse: 0,
    };
  }
}

