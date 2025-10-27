import { Injectable, Inject } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../database/database.constants';
import { tenants } from '../../database/schema/core/tenants.schema';

@Injectable()
export class TenantService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async getTenantById(tenantId: string) {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    return tenant;
  }

  async getTenantByCode(code: string) {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.code, code))
      .limit(1);

    return tenant;
  }

  async createTenant(data: any) {
    const [tenant] = await this.db
      .insert(tenants)
      .values(data)
      .returning();

    return tenant;
  }
}

