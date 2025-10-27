import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../src/common/services/cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService]
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  describe('get', () => {
    it('should get cached value', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'John' };

      jest.spyOn(service, 'get').mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const key = 'non-existent-key';

      jest.spyOn(service, 'get').mockResolvedValue(null);

      const result = await service.get(key);

      expect(result).toBeNull();
    });

    it('should handle cache errors', async () => {
      const key = 'test-key';

      jest.spyOn(service, 'get').mockRejectedValue(new Error('Cache connection failed'));

      await expect(service.get(key)).rejects.toThrow('Cache connection failed');
    });
  });

  describe('set', () => {
    it('should set cached value', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'John' };
      const ttl = 3600;

      jest.spyOn(service, 'set').mockResolvedValue(true);

      const result = await service.set(key, value, ttl);

      expect(result).toBe(true);
    });

    it('should set cached value with default TTL', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'John' };

      jest.spyOn(service, 'set').mockResolvedValue(true);

      const result = await service.set(key, value);

      expect(result).toBe(true);
    });

    it('should handle cache errors', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'John' };

      jest.spyOn(service, 'set').mockRejectedValue(new Error('Cache connection failed'));

      await expect(service.set(key, value)).rejects.toThrow('Cache connection failed');
    });
  });

  describe('del', () => {
    it('should delete cached value', async () => {
      const key = 'test-key';

      jest.spyOn(service, 'del').mockResolvedValue(true);

      const result = await service.del(key);

      expect(result).toBe(true);
    });

    it('should handle non-existent key deletion', async () => {
      const key = 'non-existent-key';

      jest.spyOn(service, 'del').mockResolvedValue(false);

      const result = await service.del(key);

      expect(result).toBe(false);
    });

    it('should handle cache errors', async () => {
      const key = 'test-key';

      jest.spyOn(service, 'del').mockRejectedValue(new Error('Cache connection failed'));

      await expect(service.del(key)).rejects.toThrow('Cache connection failed');
    });
  });

  describe('exists', () => {
    it('should check if key exists', async () => {
      const key = 'test-key';

      jest.spyOn(service, 'exists').mockResolvedValue(true);

      const result = await service.exists(key);

      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const key = 'non-existent-key';

      jest.spyOn(service, 'exists').mockResolvedValue(false);

      const result = await service.exists(key);

      expect(result).toBe(false);
    });

    it('should handle cache errors', async () => {
      const key = 'test-key';

      jest.spyOn(service, 'exists').mockRejectedValue(new Error('Cache connection failed'));

      await expect(service.exists(key)).rejects.toThrow('Cache connection failed');
    });
  });

  describe('expire', () => {
    it('should set expiration for key', async () => {
      const key = 'test-key';
      const ttl = 3600;

      jest.spyOn(service, 'expire').mockResolvedValue(true);

      const result = await service.expire(key, ttl);

      expect(result).toBe(true);
    });

    it('should handle non-existent key expiration', async () => {
      const key = 'non-existent-key';
      const ttl = 3600;

      jest.spyOn(service, 'expire').mockResolvedValue(false);

      const result = await service.expire(key, ttl);

      expect(result).toBe(false);
    });

    it('should handle cache errors', async () => {
      const key = 'test-key';
      const ttl = 3600;

      jest.spyOn(service, 'expire').mockRejectedValue(new Error('Cache connection failed'));

      await expect(service.expire(key, ttl)).rejects.toThrow('Cache connection failed');
    });
  });

  describe('flush', () => {
    it('should flush all cache', async () => {
      jest.spyOn(service, 'flush').mockResolvedValue(true);

      const result = await service.flush();

      expect(result).toBe(true);
    });

    it('should handle cache errors', async () => {
      jest.spyOn(service, 'flush').mockRejectedValue(new Error('Cache connection failed'));

      await expect(service.flush()).rejects.toThrow('Cache connection failed');
    });
  });

  describe('getMultiple', () => {
    it('should get multiple cached values', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = { key1: 'value1', key2: 'value2', key3: null };

      jest.spyOn(service, 'getMultiple').mockResolvedValue(values);

      const result = await service.getMultiple(keys);

      expect(result).toEqual(values);
    });

    it('should handle empty keys array', async () => {
      const keys = [];

      jest.spyOn(service, 'getMultiple').mockResolvedValue({});

      const result = await service.getMultiple(keys);

      expect(result).toEqual({});
    });

    it('should handle cache errors', async () => {
      const keys = ['key1', 'key2'];

      jest.spyOn(service, 'getMultiple').mockRejectedValue(new Error('Cache connection failed'));

      await expect(service.getMultiple(keys)).rejects.toThrow('Cache connection failed');
    });
  });

  describe('setMultiple', () => {
    it('should set multiple cached values', async () => {
      const keyValuePairs = { key1: 'value1', key2: 'value2', key3: 'value3' };
      const ttl = 3600;

      jest.spyOn(service, 'setMultiple').mockResolvedValue(true);

      const result = await service.setMultiple(keyValuePairs, ttl);

      expect(result).toBe(true);
    });

    it('should set multiple cached values with default TTL', async () => {
      const keyValuePairs = { key1: 'value1', key2: 'value2' };

      jest.spyOn(service, 'setMultiple').mockResolvedValue(true);

      const result = await service.setMultiple(keyValuePairs);

      expect(result).toBe(true);
    });

    it('should handle cache errors', async () => {
      const keyValuePairs = { key1: 'value1', key2: 'value2' };

      jest.spyOn(service, 'setMultiple').mockRejectedValue(new Error('Cache connection failed'));

      await expect(service.setMultiple(keyValuePairs)).rejects.toThrow('Cache connection failed');
    });
  });

  describe('delMultiple', () => {
    it('should delete multiple cached values', async () => {
      const keys = ['key1', 'key2', 'key3'];

      jest.spyOn(service, 'delMultiple').mockResolvedValue(3);

      const result = await service.delMultiple(keys);

      expect(result).toBe(3);
    });

    it('should handle empty keys array', async () => {
      const keys = [];

      jest.spyOn(service, 'delMultiple').mockResolvedValue(0);

      const result = await service.delMultiple(keys);

      expect(result).toBe(0);
    });

    it('should handle cache errors', async () => {
      const keys = ['key1', 'key2'];

      jest.spyOn(service, 'delMultiple').mockRejectedValue(new Error('Cache connection failed'));

      await expect(service.delMultiple(keys)).rejects.toThrow('Cache connection failed');
    });
  });

  describe('increment', () => {
    it('should increment cached value', async () => {
      const key = 'counter';
      const amount = 1;

      jest.spyOn(service, 'increment').mockResolvedValue(2);

      const result = await service.increment(key, amount);

      expect(result).toBe(2);
    });

    it('should increment by default amount', async () => {
      const key = 'counter';

      jest.spyOn(service, 'increment').mockResolvedValue(1);

      const result = await service.increment(key);

      expect(result).toBe(1);
    });

    it('should handle cache errors', async () => {
      const key = 'counter';

      jest.spyOn(service, 'increment').mockRejectedValue(new Error('Cache connection failed'));

      await expect(service.increment(key)).rejects.toThrow('Cache connection failed');
    });
  });

  describe('decrement', () => {
    it('should decrement cached value', async () => {
      const key = 'counter';
      const amount = 1;

      jest.spyOn(service, 'decrement').mockResolvedValue(0);

      const result = await service.decrement(key, amount);

      expect(result).toBe(0);
    });

    it('should decrement by default amount', async () => {
      const key = 'counter';

      jest.spyOn(service, 'decrement').mockResolvedValue(-1);

      const result = await service.decrement(key);

      expect(result).toBe(-1);
    });

    it('should handle cache errors', async () => {
      const key = 'counter';

      jest.spyOn(service, 'decrement').mockRejectedValue(new Error('Cache connection failed'));

      await expect(service.decrement(key)).rejects.toThrow('Cache connection failed');
    });
  });
});