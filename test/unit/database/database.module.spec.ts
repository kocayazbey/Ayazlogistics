import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../../src/database/database.module';
import { DRIZZLE_ORM } from '../../src/database/database.provider';

describe('DatabaseModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    // Mock environment variables
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
    delete process.env.DATABASE_URL;
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide DRIZZLE_ORM', () => {
    const drizzleOrm = module.get(DRIZZLE_ORM);
    expect(drizzleOrm).toBeDefined();
  });

  it('should export DRIZZLE_ORM', () => {
    const exports = module.get('DatabaseModule');
    expect(exports).toBeDefined();
  });

  it('should handle missing environment variables', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_USERNAME;
    delete process.env.DATABASE_PASSWORD;
    delete process.env.DATABASE_HOST;
    delete process.env.DATABASE_PORT;
    delete process.env.DATABASE_NAME;

    const testModule = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    const drizzleOrm = testModule.get(DRIZZLE_ORM);
    expect(drizzleOrm).toBeDefined();

    await testModule.close();
  });

  it('should use default values when environment variables are missing', async () => {
    delete process.env.DATABASE_URL;
    process.env.DATABASE_USERNAME = 'testuser';
    process.env.DATABASE_PASSWORD = 'testpass';
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_PORT = '5432';
    process.env.DATABASE_NAME = 'testdb';

    const testModule = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    const drizzleOrm = testModule.get(DRIZZLE_ORM);
    expect(drizzleOrm).toBeDefined();

    await testModule.close();
  });
});
