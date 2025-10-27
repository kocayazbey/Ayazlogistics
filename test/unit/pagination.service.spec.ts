import { Test, TestingModule } from '@nestjs/testing';
import { PaginationService } from '../../src/common/services/pagination.service';

describe('PaginationService', () => {
  let service: PaginationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaginationService]
    }).compile();

    service = module.get<PaginationService>(PaginationService);
  });

  describe('validatePagination', () => {
    it('should validate pagination parameters', () => {
      const validParams = { page: 1, limit: 10 };
      const result = service.validatePagination(validParams);

      expect(result).toEqual(validParams);
    });

    it('should set default values for missing parameters', () => {
      const params = {};
      const result = service.validatePagination(params);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle partial parameters', () => {
      const params = { page: 2 };
      const result = service.validatePagination(params);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should enforce minimum values', () => {
      const params = { page: 0, limit: -5 };
      const result = service.validatePagination(params);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should enforce maximum limit', () => {
      const params = { page: 1, limit: 1000 };
      const result = service.validatePagination(params);

      expect(result.limit).toBe(100);
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create paginated response with data', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const total = 3;
      const pagination = { page: 1, limit: 10 };

      const result = service.createPaginatedResponse(data, total, pagination);

      expect(result).toEqual({
        data,
        total,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
    });

    it('should calculate total pages correctly', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
      const total = 25;
      const pagination = { page: 1, limit: 10 };

      const result = service.createPaginatedResponse(data, total, pagination);

      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
    });

    it('should handle middle page', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ id: i + 11 }));
      const total = 25;
      const pagination = { page: 2, limit: 10 };

      const result = service.createPaginatedResponse(data, total, pagination);

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });

    it('should handle last page', () => {
      const data = Array.from({ length: 5 }, (_, i) => ({ id: i + 21 }));
      const total = 25;
      const pagination = { page: 3, limit: 10 };

      const result = service.createPaginatedResponse(data, total, pagination);

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });

    it('should handle empty data', () => {
      const data = [];
      const total = 0;
      const pagination = { page: 1, limit: 10 };

      const result = service.createPaginatedResponse(data, total, pagination);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it('should handle single page', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const total = 2;
      const pagination = { page: 1, limit: 10 };

      const result = service.createPaginatedResponse(data, total, pagination);

      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });
  });

  describe('calculateOffset', () => {
    it('should calculate offset correctly', () => {
      expect(service.calculateOffset(1, 10)).toBe(0);
      expect(service.calculateOffset(2, 10)).toBe(10);
      expect(service.calculateOffset(3, 10)).toBe(20);
    });

    it('should handle edge cases', () => {
      expect(service.calculateOffset(0, 10)).toBe(0);
      expect(service.calculateOffset(-1, 10)).toBe(0);
    });
  });

  describe('calculateTotalPages', () => {
    it('should calculate total pages correctly', () => {
      expect(service.calculateTotalPages(25, 10)).toBe(3);
      expect(service.calculateTotalPages(20, 10)).toBe(2);
      expect(service.calculateTotalPages(15, 10)).toBe(2);
      expect(service.calculateTotalPages(10, 10)).toBe(1);
      expect(service.calculateTotalPages(5, 10)).toBe(1);
      expect(service.calculateTotalPages(0, 10)).toBe(0);
    });
  });

  describe('hasNextPage', () => {
    it('should determine if there is a next page', () => {
      expect(service.hasNextPage(1, 3)).toBe(true);
      expect(service.hasNextPage(2, 3)).toBe(true);
      expect(service.hasNextPage(3, 3)).toBe(false);
    });
  });

  describe('hasPreviousPage', () => {
    it('should determine if there is a previous page', () => {
      expect(service.hasPreviousPage(1)).toBe(false);
      expect(service.hasPreviousPage(2)).toBe(true);
      expect(service.hasPreviousPage(3)).toBe(true);
    });
  });
});
