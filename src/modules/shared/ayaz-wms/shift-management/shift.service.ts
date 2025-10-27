import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, between, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class ShiftService {
  private shifts: Map<string, any> = new Map();
  private shiftAssignments: Map<string, any> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async defineShift(data: {
    shiftCode: string;
    shiftName: string;
    startTime: string;
    endTime: string;
    breakDuration?: number;
    daysOfWeek: number[];
    warehouseId: string;
  }, tenantId: string, userId: string) {
    const shiftId = `SHIFT-${Date.now()}`;

    this.shifts.set(shiftId, {
      id: shiftId,
      ...data,
      tenantId,
      createdBy: userId,
      createdAt: new Date(),
    });

    await this.eventBus.emit('shift.defined', { shiftId, shiftCode: data.shiftCode, tenantId });

    return this.shifts.get(shiftId);
  }

  async assignWorkerToShift(data: {
    workerId: string;
    shiftId: string;
    date: Date;
    role: string;
  }, tenantId: string) {
    const assignmentId = `ASSIGN-${Date.now()}`;

    this.shiftAssignments.set(assignmentId, {
      id: assignmentId,
      ...data,
      tenantId,
      assignedAt: new Date(),
    });

    await this.eventBus.emit('worker.shift.assigned', { assignmentId, workerId: data.workerId, tenantId });

    return this.shiftAssignments.get(assignmentId);
  }

  async getShiftPteTotals(shiftId: string, date: Date) {
    const shift = this.shifts.get(shiftId);

    return {
      shiftId,
      shiftName: shift?.shiftName,
      date,
      metrics: {
        totalPte: 0,
        receivedPte: 0,
        shippedPte: 0,
        transferredPte: 0,
      },
    };
  }

  async getShiftShipmentStatus(shiftId: string, warehouseId: string, date: Date) {
    return {
      shiftId,
      date,
      shipments: {
        planned: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      },
    };
  }

  async getShiftPalletMovements(shiftId: string, warehouseId: string, date: Date) {
    return {
      shiftId,
      date,
      movements: {
        received: 0,
        putaway: 0,
        picked: 0,
        shipped: 0,
        transferred: 0,
        total: 0,
      },
    };
  }

  async getActiveShift(warehouseId: string) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const dayOfWeek = now.getDay();

    const activeShifts = Array.from(this.shifts.values()).filter(shift => {
      return (
        shift.warehouseId === warehouseId &&
        shift.daysOfWeek.includes(dayOfWeek) &&
        shift.startTime <= currentTime &&
        shift.endTime >= currentTime
      );
    });

    return activeShifts[0] || null;
  }
}

