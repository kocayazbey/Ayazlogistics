import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IPFilterService } from '../../../src/core/security/ip-filter.service';

describe('IPFilterService', () => {
  let service: IPFilterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IPFilterService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<IPFilterService>(IPFilterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isAllowed', () => {
    it('should allow non-blacklisted IP', async () => {
      const result = await service.isAllowed('192.168.1.1');
      expect(result.allowed).toBe(true);
    });

    it('should block blacklisted IP', async () => {
      await service.addToBlacklist({
        ip: '10.0.0.1',
        type: 'blacklist',
        reason: 'Test block',
      });

      const result = await service.isAllowed('10.0.0.1');
      expect(result.allowed).toBe(false);
    });
  });

  describe('tempBlock', () => {
    it('should temporarily block IP', async () => {
      await service.tempBlock('192.168.1.100', 60, 'Suspicious activity');
      
      const result = await service.isAllowed('192.168.1.100');
      expect(result.allowed).toBe(false);
    });
  });
});

