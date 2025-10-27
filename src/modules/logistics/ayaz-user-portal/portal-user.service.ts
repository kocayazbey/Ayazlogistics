import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { users } from '../../../database/schema/core/users.schema';
import { EventBusService } from '../../../core/events/event-bus.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PortalUserService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createPortalUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    customerId: string;
  }, tenantId: string) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const [user] = await this.db
      .insert(users)
      .values({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'customer_user',
        isActive: true,
        metadata: {
          customerId: data.customerId,
          tenantId,
        },
      })
      .returning();

    await this.eventBus.emit('portal.user.created', {
      userId: user.id,
      customerId: data.customerId,
      tenantId,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  async updatePortalUser(userId: string, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) {
    const [updated] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    await this.eventBus.emit('portal.user.updated', { userId });

    return updated;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(oldPassword, user.password);

    if (!isValid) {
      throw new Error('Invalid old password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await this.eventBus.emit('portal.user.password.changed', { userId });

    return { success: true };
  }

  async getPortalUserPreferences(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      notifications: {
        email: true,
        sms: true,
        push: true,
      },
      language: 'en',
      timezone: 'UTC',
      theme: 'light',
      ...user?.metadata?.preferences,
    };
  }

  async updatePortalUserPreferences(userId: string, preferences: any) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    await this.db
      .update(users)
      .set({
        metadata: {
          ...user?.metadata,
          preferences,
        },
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await this.eventBus.emit('portal.user.preferences.updated', { userId });

    return preferences;
  }
}

