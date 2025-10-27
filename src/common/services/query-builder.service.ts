import { Injectable } from '@nestjs/common';
import { eq, and, or, like, gte, lte, inArray, sql } from 'drizzle-orm';
import { PgColumn } from 'drizzle-orm/pg-core';

export interface QueryFilters {
  [key: string]: any;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class QueryBuilderService {
  /**
   * Build safe WHERE conditions for database queries
   */
  buildWhereConditions(filters: QueryFilters, allowedFields: string[]): any[] {
    const conditions: any[] = [];

    for (const [field, value] of Object.entries(filters)) {
      if (!allowedFields.includes(field) || value === undefined || value === null) {
        continue;
      }

      // Handle different filter types
      if (typeof value === 'string') {
        if (value.includes('%')) {
          // Wildcard search
          conditions.push(like(sql.identifier(field), value));
        } else {
          // Exact match
          conditions.push(eq(sql.identifier(field), value));
        }
      } else if (Array.isArray(value)) {
        // IN clause
        conditions.push(inArray(sql.identifier(field), value));
      } else if (typeof value === 'object' && value !== null) {
        // Range queries
        if (value.gte !== undefined) {
          conditions.push(gte(sql.identifier(field), value.gte));
        }
        if (value.lte !== undefined) {
          conditions.push(lte(sql.identifier(field), value.lte));
        }
        if (value.gt !== undefined) {
          conditions.push(sql`${sql.identifier(field)} > ${value.gt}`);
        }
        if (value.lt !== undefined) {
          conditions.push(sql`${sql.identifier(field)} < ${value.lt}`);
        }
      } else {
        // Direct value
        conditions.push(eq(sql.identifier(field), value));
      }
    }

    return conditions.length > 0 ? [and(...conditions)] : [];
  }

  /**
   * Build pagination parameters
   */
  buildPagination(options: PaginationOptions) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    return {
      limit,
      offset,
      page,
    };
  }

  /**
   * Build ORDER BY clause
   */
  buildOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc', allowedFields: string[] = []) {
    if (!sortBy || !allowedFields.includes(sortBy)) {
      return { createdAt: 'desc' }; // Default sort
    }

    return {
      [sortBy]: sortOrder,
    };
  }

  /**
   * Sanitize field names to prevent SQL injection
   */
  sanitizeFieldName(fieldName: string): string {
    // Remove any non-alphanumeric characters except underscores
    return fieldName.replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Build search conditions for text fields
   */
  buildSearchConditions(searchTerm: string, searchFields: string[]) {
    if (!searchTerm || !searchFields.length) {
      return [];
    }

    const searchConditions = searchFields.map(field => 
      like(sql.identifier(field), `%${searchTerm}%`)
    );

    return [or(...searchConditions)];
  }

  /**
   * Build date range conditions
   */
  buildDateRangeConditions(
    startDate?: string | Date,
    endDate?: string | Date,
    dateField: string = 'createdAt'
  ) {
    const conditions: any[] = [];

    if (startDate) {
      conditions.push(gte(sql.identifier(dateField), new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(sql.identifier(dateField), new Date(endDate)));
    }

    return conditions;
  }

  /**
   * Build tenant isolation condition
   */
  buildTenantCondition(tenantId: string) {
    return eq(sql.identifier('tenant_id'), tenantId);
  }

  /**
   * Build complete query with all conditions
   */
  buildCompleteQuery(
    filters: QueryFilters,
    pagination: PaginationOptions,
    searchTerm?: string,
    searchFields: string[] = [],
    allowedFields: string[] = [],
    tenantId?: string
  ) {
    const whereConditions: any[] = [];

    // Add tenant isolation
    if (tenantId) {
      whereConditions.push(this.buildTenantCondition(tenantId));
    }

    // Add filters
    const filterConditions = this.buildWhereConditions(filters, allowedFields);
    whereConditions.push(...filterConditions);

    // Add search conditions
    if (searchTerm) {
      const searchConditions = this.buildSearchConditions(searchTerm, searchFields);
      whereConditions.push(...searchConditions);
    }

    // Build pagination
    const paginationParams = this.buildPagination(pagination);

    // Build ordering
    const orderBy = this.buildOrderBy(
      pagination.sortBy,
      pagination.sortOrder,
      allowedFields
    );

    return {
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      limit: paginationParams.limit,
      offset: paginationParams.offset,
      orderBy,
    };
  }
}
