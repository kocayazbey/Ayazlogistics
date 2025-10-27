import { Test, TestingModule } from '@nestjs/testing';
import { PalletManagementService } from './pallet-management.service';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('PalletManagementService', () => {
  let service: PalletManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PalletManagementService,
        { provide: EventBusService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<PalletManagementService>(PalletManagementService);
  });

  it('should create pallet', async () => {
    const result = await service.createPallet({ type: 'standard' });

    expect(result.palletNumber).toMatch(/^PLT-\d+$/);
    expect(result.status).toBe('empty');
    expect(result.type).toBe('standard');
  });

  it('should add item to pallet', async () => {
    const pallet = await service.createPallet({ type: 'standard' });

    const result = await service.addItemToPallet(pallet.palletNumber, {
      productId: 'prod-1',
      quantity: 10,
      weight: 50,
    });

    expect(result.items.length).toBe(1);
    expect(result.currentWeight).toBe(50);
    expect(result.status).toBe('partial');
  });

  it('should prevent weight limit exceed', async () => {
    const pallet = await service.createPallet({ type: 'standard', maxWeight: 100 });

    await expect(
      service.addItemToPallet(pallet.palletNumber, {
        productId: 'prod-1',
        quantity: 1,
        weight: 150,
      })
    ).rejects.toThrow(/weight limit exceeded/);
  });

  it('should optimize palletization', async () => {
    const items = [
      { productId: 'p1', quantity: 10, weight: 50, stackable: true },
      { productId: 'p2', quantity: 5, weight: 100, stackable: false },
      { productId: 'p3', quantity: 20, weight: 30, stackable: true },
    ];

    const result = await service.optimizePalletization(items);

    expect(result.totalPallets).toBeGreaterThan(0);
    expect(result.utilization).toBeDefined();
  });
});

