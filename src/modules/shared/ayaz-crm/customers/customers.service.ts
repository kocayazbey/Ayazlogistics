import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, like } from 'drizzle-orm';
import { customers } from '../../../../database/schema/shared/crm.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createCustomer(data: any, tenantId: string, userId: string) {
    const customerNumber = `CUST-${Date.now()}`;

    const [customer] = await this.db
      .insert(customers)
      .values({
        tenantId,
        customerNumber,
        createdBy: userId,
        ...data,
      })
      .returning();

    await this.eventBus.emit('customer.created', { customerId: customer.id, tenantId });
    return customer;
  }

  async getCustomers(tenantId: string, filters?: { customerType?: string; search?: string }) {
    let query = this.db.select().from(customers).where(eq(customers.tenantId, tenantId));

    if (filters?.customerType) {
      query = query.where(and(eq(customers.tenantId, tenantId), eq(customers.customerType, filters.customerType)));
    }

    if (filters?.search) {
      query = query.where(
        and(
          eq(customers.tenantId, tenantId),
          like(customers.companyName, `%${filters.search}%`)
        )
      );
    }

    return await query;
  }

  async updateCustomer(customerId: string, data: any, tenantId: string) {
    const [updated] = await this.db
      .update(customers)
      .set(data)
      .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('customer.updated', { customerId, tenantId });
    return updated;
  }

  async getCustomerById(customerId: string, tenantId: string) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
      .limit(1);

    return customer;
  }
}

