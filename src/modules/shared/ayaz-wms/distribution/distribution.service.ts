import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class DistributionService {
  private distributionOrders: Map<string, any> = new Map();
  private distributionCarts: Map<string, any> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createDistributionOrder(data: {
    warehouseId: string;
    orderNumber: string;
    distributionType: 'store' | 'customer' | 'transfer';
    destinations: Array<{
      destinationCode: string;
      destinationName: string;
      items: Array<{
        productId: string;
        quantity: number;
      }>;
    }>;
    priority?: string;
  }, tenantId: string, userId: string) {
    const distributionNumber = `DIST-${Date.now()}`;

    const order = {
      id: `dist-${Date.now()}`,
      distributionNumber,
      warehouseId: data.warehouseId,
      orderNumber: data.orderNumber,
      distributionType: data.distributionType,
      destinations: data.destinations,
      priority: data.priority || 'normal',
      status: 'pending',
      createdBy: userId,
      createdAt: new Date(),
    };

    this.distributionOrders.set(order.id, order);

    await this.eventBus.emit('distribution.order.created', { distributionId: order.id, distributionNumber, tenantId });

    return order;
  }

  async createDistributionCart(data: {
    distributionOrderId: string;
    cartNumber: string;
    assignedTo?: string;
  }, userId: string) {
    const cartId = `CART-DIST-${Date.now()}`;

    const cart = {
      id: cartId,
      cartNumber: data.cartNumber,
      distributionOrderId: data.distributionOrderId,
      assignedTo: data.assignedTo,
      items: [],
      status: 'active',
      createdBy: userId,
      createdAt: new Date(),
    };

    this.distributionCarts.set(cartId, cart);

    await this.eventBus.emit('distribution.cart.created', { cartId, distributionOrderId: data.distributionOrderId });

    return cart;
  }

  async trackDistributionCart(cartId: string) {
    const cart = this.distributionCarts.get(cartId);

    if (!cart) {
      return { found: false, cartId };
    }

    return {
      cart,
      itemCount: cart.items.length,
      totalQuantity: cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      status: cart.status,
    };
  }

  async addItemToDistributionCart(data: {
    cartId: string;
    productId: string;
    quantity: number;
    destinationCode: string;
  }, userId: string) {
    const cart = this.distributionCarts.get(data.cartId);

    if (!cart) {
      throw new NotFoundException('Distribution cart not found');
    }

    cart.items.push({
      productId: data.productId,
      quantity: data.quantity,
      destinationCode: data.destinationCode,
      addedAt: new Date(),
    });

    this.distributionCarts.set(data.cartId, cart);

    await this.eventBus.emit('distribution.cart.item.added', { cartId: data.cartId, productId: data.productId });

    return { cartId: data.cartId, itemsInCart: cart.items.length };
  }

  async completeDistribution(distributionOrderId: string, userId: string) {
    const order = this.distributionOrders.get(distributionOrderId);

    if (!order) {
      throw new NotFoundException('Distribution order not found');
    }

    order.status = 'completed';
    order.completedBy = userId;
    order.completedAt = new Date();

    this.distributionOrders.set(distributionOrderId, order);

    await this.eventBus.emit('distribution.completed', { distributionOrderId });

    return { distributionOrderId, status: 'completed', completedAt: new Date() };
  }
}

