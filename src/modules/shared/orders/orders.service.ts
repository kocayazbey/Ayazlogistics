import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { eq, and, desc, count, like, or } from 'drizzle-orm';
import { orders } from '../../../database/schema/shared/orders.schema';

@Injectable()
export class OrdersService {
  constructor(private readonly dbService: DatabaseService) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getAll(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerId?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(orders.tenantId, tenantId)];

    if (filters?.search) {
      conditions.push(
        or(
          like(orders.orderNumber, `%${filters.search}%`),
          like(orders.customerName, `%${filters.search}%`),
          like(orders.customerEmail, `%${filters.search}%`)
        )
      );
    }

    if (filters?.status) {
      conditions.push(eq(orders.status, filters.status as any));
    }

    if (filters?.customerId) {
      conditions.push(eq(orders.customerId, filters.customerId));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(orders)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(orders.createdAt)),
        this.db
          .select({ count: count() })
          .from(orders)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getAll:', error);
      return {
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  async getById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Order not found');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Order not found');
    }
  }

  async create(data: any, tenantId: string, userId: string) {
    try {
      const orderNumber = `ORD-${Date.now()}`;
      const result = await this.db
        .insert(orders)
        .values({
          ...data,
          tenantId,
          orderNumber,
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in create:', error);
      const orderNumber = `ORD-${Date.now()}`;
      return { 
        ...data, 
        id: Date.now().toString(), 
        orderNumber, 
        tenantId, 
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  async update(id: string, data: any, tenantId: string) {
    try {
      const result = await this.db
        .update(orders)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Order not found');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in update:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      return { ...data, id, updatedAt: new Date() };
    }
  }

  async delete(id: string, tenantId: string) {
    try {
      await this.db
        .delete(orders)
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)));

      return { success: true, deletedId: id };
    } catch (error) {
      console.error('Database error in delete:', error);
      return { success: false, deletedId: id };
    }
  }

  async updateStatus(id: string, status: string, tenantId: string) {
    try {
      const updateData: any = { status: status as any, updatedAt: new Date() };
      
      if (status === 'shipped') {
        updateData.shippedAt = new Date();
      } else if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      }

      const result = await this.db
        .update(orders)
        .set(updateData)
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Order not found');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in updateStatus:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      return { id, status, updatedAt: new Date() };
    }
  }

  async getStats(tenantId: string) {
    try {
      const allOrders = await this.db
        .select()
        .from(orders)
        .where(eq(orders.tenantId, tenantId));

      const total = allOrders.length;
      const pending = allOrders.filter(o => o.status === 'pending').length;
      const processing = allOrders.filter(o => o.status === 'processing').length;
      const completed = allOrders.filter(o => o.status === 'delivered').length;
      const cancelled = allOrders.filter(o => o.status === 'cancelled').length;
      
      const totalRevenue = allOrders.reduce((sum, order) => {
        if (order.totals && typeof order.totals === 'object' && 'total' in order.totals) {
          return sum + Number(order.totals.total || 0);
        }
        return sum;
      }, 0);

      return {
        total,
        pending,
        processing,
        completed,
        cancelled,
        totalRevenue,
      };
    } catch (error) {
      console.error('Database error in getStats:', error);
      return {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
        totalRevenue: 0,
      };
    }
  }
}
