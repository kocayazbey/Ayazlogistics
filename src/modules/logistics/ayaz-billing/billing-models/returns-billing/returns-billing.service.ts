import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../../core/events/event-bus.service';

type ReturnActivityType = 'inspection' | 'restocking' | 'disposal' | 'repackaging' | 'refurbishment';

interface ReturnsBillingActivity {
  contractId: string;
  returnId: string;
  activityType: ReturnActivityType;
  quantity: number;
  unit: 'piece' | 'carton' | 'pallet';
  condition: 'good' | 'damaged' | 'defective';
  timestamp: Date;
}

@Injectable()
export class ReturnsBillingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async calculateReturnsCost(activity: ReturnsBillingActivity): Promise<number> {
    const baseRates: Record<ReturnActivityType, Record<string, number>> = {
      'inspection': { piece: 2.0, carton: 10, pallet: 40 },
      'restocking': { piece: 1.5, carton: 7.5, pallet: 30 },
      'disposal': { piece: 3.0, carton: 15, pallet: 60 },
      'repackaging': { piece: 4.0, carton: 20, pallet: 80 },
      'refurbishment': { piece: 8.0, carton: 40, pallet: 160 },
    };

    const conditionMultiplier = {
      'good': 1.0,
      'damaged': 1.3,
      'defective': 1.5,
    }[activity.condition];

    const baseRate = baseRates[activity.activityType][activity.unit] || 2.0;
    const cost = baseRate * activity.quantity * conditionMultiplier;

    return Math.round(cost * 100) / 100;
  }
}

