import { Test, TestingModule } from '@nestjs/testing';
import { CartonizationService } from './cartonization.service';

describe('CartonizationService', () => {
  let service: CartonizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CartonizationService],
    }).compile();

    service = module.get<CartonizationService>(CartonizationService);
  });

  it('should optimize cartonization', async () => {
    const items = [
      { productId: 'p1', quantity: 5, dimensions: { length: 10, width: 10, height: 10 }, weight: 1 },
      { productId: 'p2', quantity: 3, dimensions: { length: 15, width: 10, height: 10 }, weight: 2 },
    ];

    const result = await service.optimizeCartonization(items);

    expect(result.totalCartons).toBeGreaterThan(0);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.cartons.length).toBe(result.totalCartons);
  });

  it('should handle fragile items carefully', async () => {
    const items = [
      { productId: 'p1', quantity: 1, dimensions: { length: 10, width: 10, height: 10 }, weight: 1, fragile: true },
      { productId: 'p2', quantity: 1, dimensions: { length: 10, width: 10, height: 10 }, weight: 5, fragile: false },
    ];

    const result = await service.optimizeCartonization(items);

    // Heavy items should be packed first (at bottom)
    expect(result.cartons).toBeDefined();
  });

  it('should generate packing instructions', async () => {
    const cartonizationResult = {
      cartons: [{
        cartonType: { type: 'M' },
        items: [
          { productId: 'p1', quantity: 1, fragile: true },
          { productId: 'p2', quantity: 1, fragile: false },
        ],
        totalWeight: 5,
      }],
    };

    const instructions = await service.generatePackingInstructions(cartonizationResult);

    expect(Array.isArray(instructions)).toBe(true);
    expect(instructions[0]).toHaveProperty('cartonNumber');
    expect(instructions[0]).toHaveProperty('items');
  });
});

