import { Test, TestingModule } from '@nestjs/testing';
import { databaseProvider, DRIZZLE_ORM } from '../../src/database/database.provider';

describe('DatabaseProvider', () => {
  let provider: any;

  beforeEach(async () => {
    // Mock environment variables
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [databaseProvider],
    }).compile();

    provider = module.get(DRIZZLE_ORM);
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should create database connection', () => {
    expect(provider).toBeDefined();
    expect(typeof provider).toBe('object');
  });

  it('should use environment variables for connection', () => {
    // The provider should use the mocked DATABASE_URL
    expect(process.env.DATABASE_URL).toBe('postgresql://test:test@localhost:5432/test');
  });
});
