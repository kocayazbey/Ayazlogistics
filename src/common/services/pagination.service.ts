import { Injectable } from '@nestjs/common';
import { PaginationDto, SortOrder } from '../dto/pagination.dto';

@Injectable()
export class PaginationService {
  /**
   * Calculate pagination metadata
   */
  calculatePagination(page: number, limit: number, total: number) {
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    return {
      page,
      limit,
      total,
      pages,
      hasNext,
      hasPrev,
    };
  }

  /**
   * Calculate offset for database queries
   */
  calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Validate pagination parameters
   */
  validatePagination(page: number, limit: number): { page: number; limit: number } {
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    return {
      page: validatedPage,
      limit: validatedLimit,
    };
  }

  /**
   * Build sort order for database queries
   */
  buildSortOrder(sortBy?: string, sortOrder?: SortOrder) {
    if (!sortBy) {
      return { createdAt: 'desc' };
    }

    return {
      [sortBy]: sortOrder === SortOrder.ASC ? 'asc' : 'desc',
    };
  }

  /**
   * Build search filter for database queries
   */
  buildSearchFilter(search?: string, searchFields: string[] = []) {
    if (!search || searchFields.length === 0) {
      return {};
    }

    // This would be implemented based on your ORM
    // For Drizzle, you might use like() with OR conditions
    return {
      search,
      searchFields,
    };
  }

  /**
   * Build date range filter
   */
  buildDateRangeFilter(startDate?: string, endDate?: string, dateField: string = 'createdAt') {
    const filter: any = {};

    if (startDate) {
      filter[`${dateField}_gte`] = new Date(startDate);
    }

    if (endDate) {
      filter[`${dateField}_lte`] = new Date(endDate);
    }

    return filter;
  }

  /**
   * Build status filter
   */
  buildStatusFilter(status?: string, statusField: string = 'status') {
    if (!status) {
      return {};
    }

    return {
      [statusField]: status,
    };
  }

  /**
   * Build category filter
   */
  buildCategoryFilter(category?: string, categoryField: string = 'category') {
    if (!category) {
      return {};
    }

    return {
      [categoryField]: category,
    };
  }

  /**
   * Build user filter
   */
  buildUserFilter(userId?: string, userField: string = 'userId') {
    if (!userId) {
      return {};
    }

    return {
      [userField]: userId,
    };
  }

  /**
   * Combine all filters
   */
  buildFilters(
    search?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    category?: string,
    userId?: string,
    searchFields: string[] = [],
    dateField: string = 'createdAt',
    statusField: string = 'status',
    categoryField: string = 'category',
    userField: string = 'userId'
  ) {
    const filters = {
      ...this.buildSearchFilter(search, searchFields),
      ...this.buildDateRangeFilter(startDate, endDate, dateField),
      ...this.buildStatusFilter(status, statusField),
      ...this.buildCategoryFilter(category, categoryField),
      ...this.buildUserFilter(userId, userField),
    };

    // Remove empty values
    return Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined && value !== null && value !== '')
    );
  }

  /**
   * Build pagination response
   */
  buildPaginationResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ) {
    const pagination = this.calculatePagination(page, limit, total);

    return {
      data,
      pagination,
    };
  }

  /**
   * Get pagination info from query
   */
  getPaginationInfo(query: PaginationDto) {
    const { page = 1, limit = 10 } = query;
    const validated = this.validatePagination(page, limit);
    const offset = this.calculateOffset(validated.page, validated.limit);

    return {
      page: validated.page,
      limit: validated.limit,
      offset,
    };
  }

  /**
   * Get sort info from query
   */
  getSortInfo(query: PaginationDto) {
    const { sortBy, sortOrder } = query;
    return this.buildSortOrder(sortBy, sortOrder);
  }

  /**
   * Get filter info from query
   */
  getFilterInfo(
    query: any,
    searchFields: string[] = [],
    dateField: string = 'createdAt',
    statusField: string = 'status',
    categoryField: string = 'category',
    userField: string = 'userId'
  ) {
    const { search, startDate, endDate, status, category, userId } = query;
    return this.buildFilters(
      search,
      startDate,
      endDate,
      status,
      category,
      userId,
      searchFields,
      dateField,
      statusField,
      categoryField,
      userField
    );
  }
}