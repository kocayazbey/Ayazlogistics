import { Test, TestingModule } from '@nestjs/testing';
import { QueryBuilderService } from '../../src/common/services/query-builder.service';

describe('QueryBuilderService', () => {
  let service: QueryBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryBuilderService]
    }).compile();

    service = module.get<QueryBuilderService>(QueryBuilderService);
  });

  describe('buildQuery', () => {
    it('should build basic query', () => {
      const filters = { status: 'active', type: 'driver' };
      const result = service.buildQuery('drivers', filters);

      expect(result).toContain('SELECT * FROM drivers');
      expect(result).toContain('WHERE');
      expect(result).toContain('status = $1');
      expect(result).toContain('type = $2');
    });

    it('should handle empty filters', () => {
      const filters = {};
      const result = service.buildQuery('drivers', filters);

      expect(result).toBe('SELECT * FROM drivers');
    });

    it('should handle null filters', () => {
      const result = service.buildQuery('drivers', null);

      expect(result).toBe('SELECT * FROM drivers');
    });

    it('should handle undefined filters', () => {
      const result = service.buildQuery('drivers', undefined);

      expect(result).toBe('SELECT * FROM drivers');
    });

    it('should build query with pagination', () => {
      const filters = { page: 1, limit: 10, status: 'active' };
      const result = service.buildQuery('drivers', filters);

      expect(result).toContain('SELECT * FROM drivers');
      expect(result).toContain('WHERE status = $1');
      expect(result).toContain('LIMIT $2 OFFSET $3');
    });

    it('should build query with sorting', () => {
      const filters = { sortBy: 'name', sortOrder: 'asc' };
      const result = service.buildQuery('drivers', filters);

      expect(result).toContain('SELECT * FROM drivers');
      expect(result).toContain('ORDER BY name ASC');
    });

    it('should build query with search', () => {
      const filters = { search: 'John' };
      const result = service.buildQuery('drivers', filters);

      expect(result).toContain('SELECT * FROM drivers');
      expect(result).toContain('WHERE (name ILIKE $1 OR email ILIKE $1)');
    });

    it('should build complex query', () => {
      const filters = {
        status: 'active',
        type: 'driver',
        search: 'John',
        sortBy: 'name',
        sortOrder: 'asc',
        page: 1,
        limit: 10
      };
      const result = service.buildQuery('drivers', filters);

      expect(result).toContain('SELECT * FROM drivers');
      expect(result).toContain('WHERE status = $1');
      expect(result).toContain('AND type = $2');
      expect(result).toContain('AND (name ILIKE $3 OR email ILIKE $3)');
      expect(result).toContain('ORDER BY name ASC');
      expect(result).toContain('LIMIT $4 OFFSET $5');
    });
  });

  describe('executeQuery', () => {
    it('should execute query with parameters', async () => {
      const query = 'SELECT * FROM drivers WHERE status = $1';
      const params = ['active'];
      const mockResult = [{ id: 1, name: 'John', status: 'active' }];

      // Mock database execution
      jest.spyOn(service, 'executeQuery').mockResolvedValue(mockResult);

      const result = await service.executeQuery(query, params);

      expect(result).toEqual(mockResult);
    });

    it('should handle empty parameters', async () => {
      const query = 'SELECT * FROM drivers';
      const mockResult = [{ id: 1, name: 'John' }];

      jest.spyOn(service, 'executeQuery').mockResolvedValue(mockResult);

      const result = await service.executeQuery(query, []);

      expect(result).toEqual(mockResult);
    });

    it('should handle null parameters', async () => {
      const query = 'SELECT * FROM drivers';
      const mockResult = [{ id: 1, name: 'John' }];

      jest.spyOn(service, 'executeQuery').mockResolvedValue(mockResult);

      const result = await service.executeQuery(query, null);

      expect(result).toEqual(mockResult);
    });

    it('should handle database errors', async () => {
      const query = 'SELECT * FROM drivers WHERE status = $1';
      const params = ['active'];

      jest.spyOn(service, 'executeQuery').mockRejectedValue(new Error('Database connection failed'));

      await expect(service.executeQuery(query, params)).rejects.toThrow('Database connection failed');
    });
  });

  describe('buildCountQuery', () => {
    it('should build count query', () => {
      const filters = { status: 'active' };
      const result = service.buildCountQuery('drivers', filters);

      expect(result).toContain('SELECT COUNT(*) FROM drivers');
      expect(result).toContain('WHERE status = $1');
    });

    it('should handle empty filters for count', () => {
      const filters = {};
      const result = service.buildCountQuery('drivers', filters);

      expect(result).toBe('SELECT COUNT(*) FROM drivers');
    });
  });

  describe('buildSearchCondition', () => {
    it('should build search condition for single field', () => {
      const result = service.buildSearchCondition('name', 'John');

      expect(result).toBe('name ILIKE $1');
    });

    it('should build search condition for multiple fields', () => {
      const result = service.buildSearchCondition(['name', 'email'], 'John');

      expect(result).toBe('(name ILIKE $1 OR email ILIKE $1)');
    });

    it('should handle empty search term', () => {
      const result = service.buildSearchCondition('name', '');

      expect(result).toBe('');
    });

    it('should handle null search term', () => {
      const result = service.buildSearchCondition('name', null);

      expect(result).toBe('');
    });
  });

  describe('buildSortClause', () => {
    it('should build sort clause', () => {
      const result = service.buildSortClause('name', 'asc');

      expect(result).toBe('ORDER BY name ASC');
    });

    it('should handle descending order', () => {
      const result = service.buildSortClause('name', 'desc');

      expect(result).toBe('ORDER BY name DESC');
    });

    it('should handle default sort order', () => {
      const result = service.buildSortClause('name');

      expect(result).toBe('ORDER BY name ASC');
    });

    it('should handle null sort field', () => {
      const result = service.buildSortClause(null, 'asc');

      expect(result).toBe('');
    });
  });

  describe('buildPaginationClause', () => {
    it('should build pagination clause', () => {
      const result = service.buildPaginationClause(1, 10);

      expect(result).toBe('LIMIT $1 OFFSET $2');
    });

    it('should handle zero page', () => {
      const result = service.buildPaginationClause(0, 10);

      expect(result).toBe('LIMIT $1 OFFSET $2');
    });

    it('should handle zero limit', () => {
      const result = service.buildPaginationClause(1, 0);

      expect(result).toBe('');
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize input string', () => {
      const result = service.sanitizeInput('John\'s Driver');

      expect(result).toBe('John\'s Driver');
    });

    it('should handle null input', () => {
      const result = service.sanitizeInput(null);

      expect(result).toBe('');
    });

    it('should handle undefined input', () => {
      const result = service.sanitizeInput(undefined);

      expect(result).toBe('');
    });

    it('should handle empty string', () => {
      const result = service.sanitizeInput('');

      expect(result).toBe('');
    });
  });

  describe('validateFilters', () => {
    it('should validate filters', () => {
      const filters = { status: 'active', page: 1, limit: 10 };
      const result = service.validateFilters(filters);

      expect(result).toEqual(filters);
    });

    it('should remove invalid filters', () => {
      const filters = { status: 'active', invalidField: 'value', page: 1 };
      const result = service.validateFilters(filters);

      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('page', 1);
      expect(result).not.toHaveProperty('invalidField');
    });

    it('should handle null filters', () => {
      const result = service.validateFilters(null);

      expect(result).toEqual({});
    });

    it('should handle undefined filters', () => {
      const result = service.validateFilters(undefined);

      expect(result).toEqual({});
    });
  });
});
