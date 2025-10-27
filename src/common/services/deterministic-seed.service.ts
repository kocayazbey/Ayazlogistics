import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DeterministicSeedService {
  private readonly logger = new Logger('DeterministicSeedService');

  generateSeedData(): any {
    return {
      users: [
        { id: 1, name: 'Test User 1', email: 'test1@example.com', tenantId: 'tenant-1' },
        { id: 2, name: 'Test User 2', email: 'test2@example.com', tenantId: 'tenant-2' }
      ],
      tenants: [
        { id: 'tenant-1', name: 'Test Tenant 1', isActive: true },
        { id: 'tenant-2', name: 'Test Tenant 2', isActive: true }
      ],
      warehouses: [
        { id: 1, name: 'Test Warehouse 1', tenantId: 'tenant-1' },
        { id: 2, name: 'Test Warehouse 2', tenantId: 'tenant-2' }
      ]
    };
  }

  async seedDatabase(): Promise<void> {
    this.logger.debug('Seeding database with deterministic test data');
    // Implementation would insert seed data into database
  }
}
