import { Test, TestingModule } from '@nestjs/testing';
import { TmsService } from './tms.service';
import { TmsController } from './tms.controller';
import { DatabaseModule } from '../../../core/database/database.module';
import { HealthModule } from '../../../core/health/health.module';

describe('TMS Integration Tests', () => {
  let service: TmsService;
  let controller: TmsController;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule, HealthModule],
      controllers: [TmsController],
      providers: [TmsService],
    }).compile();

    service = module.get<TmsService>(TmsService);
    controller = module.get<TmsController>(TmsController);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('TMS Service Integration', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have transaction manager', () => {
      expect(service['transactionManager']).toBeDefined();
    });

    it('should have query optimizer', () => {
      expect(service['queryOptimizer']).toBeDefined();
    });
  });

  describe('TMS Controller Integration', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('Database Integration', () => {
    it('should have database connection', () => {
      expect(service['db']).toBeDefined();
    });
  });
});
