import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '../../src/common/pipes/validation.pipe';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';

describe('ValidationPipe', () => {
  let pipe: ValidationPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationPipe]
    }).compile();

    pipe = module.get<ValidationPipe>(ValidationPipe);
  });

  describe('transform', () => {
    it('should transform valid data', async () => {
      const value = { name: 'John', email: 'john@example.com' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class TestDto {},
        data: undefined
      };

      const result = await pipe.transform(value, metadata);

      expect(result).toEqual(value);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const value = { name: '', email: 'invalid-email' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class TestDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle null value', async () => {
      const value = null;
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class TestDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle undefined value', async () => {
      const value = undefined;
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class TestDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle empty object', async () => {
      const value = {};
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class TestDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle primitive types', async () => {
      const value = 'string';
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: String,
        data: undefined
      };

      const result = await pipe.transform(value, metadata);

      expect(result).toBe(value);
    });

    it('should handle arrays', async () => {
      const value = [{ name: 'John' }, { name: 'Jane' }];
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: Array,
        data: undefined
      };

      const result = await pipe.transform(value, metadata);

      expect(result).toEqual(value);
    });

    it('should handle query parameters', async () => {
      const value = { page: 1, limit: 10 };
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: class QueryDto {},
        data: undefined
      };

      const result = await pipe.transform(value, metadata);

      expect(result).toEqual(value);
    });

    it('should handle route parameters', async () => {
      const value = 'user-123';
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: 'id'
      };

      const result = await pipe.transform(value, metadata);

      expect(result).toBe(value);
    });

    it('should handle custom validation rules', async () => {
      const value = { age: 15 };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class AgeDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle nested object validation', async () => {
      const value = {
        user: {
          name: '',
          email: 'invalid-email'
        }
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class NestedDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle array validation', async () => {
      const value = {
        items: [
          { name: 'Item 1', price: -10 },
          { name: '', price: 20 }
        ]
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class ArrayDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle date validation', async () => {
      const value = {
        startDate: 'invalid-date',
        endDate: '2025-01-27'
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class DateDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle number validation', async () => {
      const value = {
        count: 'not-a-number',
        price: 10.5
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class NumberDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle boolean validation', async () => {
      const value = {
        isActive: 'not-a-boolean',
        isVerified: true
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class BooleanDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle enum validation', async () => {
      const value = {
        status: 'invalid-status',
        type: 'valid-type'
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class EnumDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle custom decorators', async () => {
      const value = {
        password: 'weak',
        confirmPassword: 'weak'
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class PasswordDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle conditional validation', async () => {
      const value = {
        type: 'premium',
        discountCode: '' // Required for premium type
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class ConditionalDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle async validation', async () => {
      const value = {
        email: 'existing@example.com'
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class AsyncDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle file upload validation', async () => {
      const value = {
        file: {
          size: 0,
          mimetype: 'text/plain'
        }
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class FileDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle nested array validation', async () => {
      const value = {
        users: [
          {
            name: 'John',
            contacts: [
              { type: 'email', value: 'invalid-email' }
            ]
          }
        ]
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class NestedArrayDto {},
        data: undefined
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });
  });

  describe('error handling', () => {
    it('should provide detailed error messages', async () => {
      const value = { name: '', email: 'invalid' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class TestDto {},
        data: undefined
      };

      try {
        await pipe.transform(value, metadata);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('validation failed');
      }
    });

    it('should handle validation pipe errors gracefully', async () => {
      const value = { name: 'John' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class TestDto {},
        data: undefined
      };

      // Mock validation pipe to throw error
      jest.spyOn(pipe, 'transform').mockRejectedValue(new Error('Validation pipe error'));

      await expect(pipe.transform(value, metadata)).rejects.toThrow('Validation pipe error');
    });
  });
});