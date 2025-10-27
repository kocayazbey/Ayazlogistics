import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { ComprehensiveLoggerService } from '../../../common/services/comprehensive-logger.service';
import { eq, and, like, desc, or, count } from 'drizzle-orm';
import { products } from '../../../database/schema/shared/products.schema';

@Injectable()
export class ProductsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly logger: ComprehensiveLoggerService
  ) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getAll(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(products.tenantId, tenantId)];

    if (filters?.search) {
      conditions.push(
        or(
          like(products.name, `%${filters.search}%`),
          like(products.sku, `%${filters.search}%`),
          like(products.description, `%${filters.search}%`)
        )
      );
    }

    if (filters?.category) {
      conditions.push(eq(products.category, filters.category));
    }

    if (filters?.status) {
      conditions.push(eq(products.status, filters.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(products)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(products.createdAt)),
        this.db
          .select({ count: count() })
          .from(products)
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
      this.logger.logError(error, 'ProductsService.getAll', { tenantId });
      throw new BadRequestException(`Failed to retrieve products: ${error.message}`);
    }
  }

  async getById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(products)
        .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Product not found');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Product not found');
    }
  }

  async create(data: any, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .insert(products)
        .values({
          ...data,
          tenantId,
        })
        .returning();

      return result[0];
    } catch (error) {
      this.logger.logError(error, 'ProductsService.create', { tenantId });
      throw new BadRequestException(`Failed to create product: ${error.message}`);
    }
  }

  async update(id: string, data: any, tenantId: string) {
    try {
      const result = await this.db
        .update(products)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Product not found');
      }

      return result[0];
    } catch (error) {
      this.logger.logError(error, 'ProductsService.update', { id, tenantId });
      throw error;
    }
  }

  async delete(id: string, tenantId: string) {
    try {
      await this.db
        .delete(products)
        .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));

      return { success: true, deletedId: id };
    } catch (error) {
      this.logger.logError(error, 'ProductsService.delete', { id, tenantId });
      throw error;
    }
  }

  async updateStock(id: string, stock: any, tenantId: string) {
    try {
      const result = await this.db
        .update(products)
        .set({ stock, updatedAt: new Date() })
        .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Product not found');
      }

      return result[0];
    } catch (error) {
      this.logger.logError(error, 'ProductsService.updateStock', { id, tenantId });
      throw error;
    }
  }

  async bulkUpdate(updates: any[], tenantId: string) {
    const results = [];
    for (const update of updates) {
      try {
        const result = await this.update(update.id, update.data, tenantId);
        results.push({ ...update, success: true, result });
      } catch (error) {
        results.push({ ...update, success: false, error: error.message });
      }
    }
    return results;
  }

  async getCategories(tenantId: string) {
    try {
      const result = await this.db
        .select({
          name: products.category,
          count: count(),
        })
        .from(products)
        .where(eq(products.tenantId, tenantId))
        .groupBy(products.category);

      return result;
    } catch (error) {
      this.logger.logError(error, 'ProductsService.getCategories', { tenantId });
      throw new BadRequestException(`Failed to retrieve categories: ${error.message}`);
    }
  }

  async getSuppliers(tenantId: string) {
    try {
      const result = await this.db
        .select({
          name: products.supplier,
          count: count(),
        })
        .from(products)
        .where(eq(products.tenantId, tenantId))
        .groupBy(products.supplier);

      return result;
    } catch (error) {
      this.logger.logError(error, 'ProductsService.getSuppliers', { tenantId });
      throw new BadRequestException(`Failed to retrieve suppliers: ${error.message}`);
    }
  }

  async export(filter: any, tenantId: string) {
    const result = await this.getAll(tenantId, filter);
    return result.data;
  }

  async import(data: any, tenantId: string) {
    const results = [];
    for (const product of data.products) {
      try {
        const result = await this.create(product, tenantId, 'system');
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, data: product, error: error.message });
      }
    }
    return results;
  }

  async getStats(tenantId: string) {
    try {
      const [totalProducts, lowStockProducts, categoriesCount, suppliersCount] = await Promise.all([
        this.db.select({ count: count() }).from(products).where(eq(products.tenantId, tenantId)),
        this.db.select({ count: count() }).from(products).where(
          and(
            eq(products.tenantId, tenantId),
            eq(products.status, 'active'),
            // Assuming low stock threshold is 10
            // Note: This would need to check actual stock levels from inventory table
          )
        ),
        this.db.select({ count: count() }).from(products).where(eq(products.tenantId, tenantId)),
        this.db.select({ count: count() }).from(products).where(eq(products.tenantId, tenantId)),
      ]);

      return {
        totalProducts: Number(totalProducts[0].count),
        lowStockProducts: Number(lowStockProducts[0].count),
        categoriesCount: Number(categoriesCount[0].count),
        suppliersCount: Number(suppliersCount[0].count),
      };
    } catch (error) {
      this.logger.logError(error, 'ProductsService.getStats', { tenantId });
      throw new BadRequestException(`Failed to retrieve stats: ${error.message}`);
    }
  }

  async getLowStock(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    threshold?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;
    const threshold = filters?.threshold || 10;

    try {
      // This is a simplified check - in production, you'd join with inventory table
      const result = await this.db
        .select()
        .from(products)
        .where(
          and(
            eq(products.tenantId, tenantId),
            eq(products.status, 'active'),
            // Note: This needs proper stock checking from inventory table
          )
        )
        .limit(limit)
        .offset(offset);

      return {
        data: result,
        meta: {
          page,
          limit,
          total: result.length,
          totalPages: Math.ceil(result.length / limit),
        },
      };
    } catch (error) {
      this.logger.logError(error, 'ProductsService.getLowStock', { tenantId, filters });
      throw new BadRequestException(`Failed to retrieve low stock products: ${error.message}`);
    }
  }
}
