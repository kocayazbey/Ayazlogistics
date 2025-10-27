import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { portalUsers } from '../../../../database/schema/logistics/user-portal.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PortalUserService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createPortalUser(data: any, tenantId: string) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const [user] = await this.db
      .insert(portalUsers)
      .values({
        tenantId,
        password: hashedPassword,
        ...data,
      })
      .returning();

    const { password: _, ...userWithoutPassword } = user;

    await this.eventBus.emit('portal_user.created', { userId: user.id, customerId: data.customerId, tenantId });
    return userWithoutPassword;
  }

  async validatePortalUser(email: string, password: string, tenantId: string) {
    const [user] = await this.db
      .select()
      .from(portalUsers)
      .where(and(eq(portalUsers.email, email), eq(portalUsers.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid || !user.isActive) {
      return null;
    }

    await this.db
      .update(portalUsers)
      .set({ lastLogin: new Date() })
      .where(eq(portalUsers.id, user.id));

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getPortalUsersByCustomer(customerId: string, tenantId: string) {
    const users = await this.db
      .select()
      .from(portalUsers)
      .where(and(eq(portalUsers.customerId, customerId), eq(portalUsers.tenantId, tenantId)));

    return users.map(({ password, ...user }) => user);
  }

  async updatePermissions(userId: string, permissions: any, tenantId: string) {
    const [updated] = await this.db
      .update(portalUsers)
      .set({ permissions })
      .where(and(eq(portalUsers.id, userId), eq(portalUsers.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('portal_user.permissions_updated', { userId, tenantId });

    const { password: _, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }
}

