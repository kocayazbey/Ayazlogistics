import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../../core/events/event-bus.service';

@Injectable()
export class AppointmentFeesService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async calculateAppointmentFee(data: {
    appointmentType: 'inbound' | 'outbound';
    scheduledTime: Date;
    actualArrivalTime?: Date;
    noShow?: boolean;
  }): Promise<{ baseFee: number; lateFee: number; noShowFee: number; totalFee: number }> {
    const baseFee = data.appointmentType === 'inbound' ? 50 : 40;
    let lateFee = 0;
    let noShowFee = 0;

    if (data.noShow) {
      noShowFee = 200;
    } else if (data.actualArrivalTime) {
      const lateMinutes = Math.floor(
        (data.actualArrivalTime.getTime() - data.scheduledTime.getTime()) / (1000 * 60),
      );

      if (lateMinutes > 60) {
        lateFee = 150;
      } else if (lateMinutes > 30) {
        lateFee = 75;
      } else if (lateMinutes > 15) {
        lateFee = 30;
      }
    }

    return {
      baseFee,
      lateFee,
      noShowFee,
      totalFee: baseFee + lateFee + noShowFee,
    };
  }
}

