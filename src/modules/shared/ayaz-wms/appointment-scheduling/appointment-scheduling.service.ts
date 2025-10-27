import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';

interface AppointmentRequest {
  warehouseId: string;
  customerId: string;
  appointmentType: 'inbound' | 'outbound';
  appointmentDate: Date;
  timeSlot: string; // e.g., '09:00-11:00'
  dockDoorId?: string;
  vehicleType: 'truck' | 'van' | 'container';
  palletCount?: number;
  estimatedDuration?: number; // minutes
  carrierName?: string;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  poNumber?: string;
  notes?: string;
}

interface DockDoor {
  id: string;
  warehouseId: string;
  doorNumber: string;
  doorType: 'inbound' | 'outbound' | 'both';
  isActive: boolean;
  capabilities?: string[];
}

interface Appointment {
  id: string;
  warehouseId: string;
  customerId: string;
  appointmentType: 'inbound' | 'outbound';
  appointmentDate: Date;
  timeSlot: string;
  dockDoorId: string;
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  vehicleType: string;
  palletCount?: number;
  actualPalletCount?: number;
  estimatedDuration?: number;
  actualDuration?: number;
  checkInTime?: Date;
  checkOutTime?: Date;
  carrierName?: string;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  poNumber?: string;
  notes?: string;
  lateArrival?: boolean;
  lateMinutes?: number;
  createdAt: Date;
  updatedAt?: Date;
}

@Injectable()
export class AppointmentSchedulingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  async createAppointment(request: AppointmentRequest, tenantId: string, userId: string): Promise<Appointment> {
    const availableSlots = await this.getAvailableTimeSlots(
      request.warehouseId,
      request.appointmentDate,
      request.appointmentType,
      tenantId,
    );

    const isSlotAvailable = availableSlots.some(slot => 
      slot.timeSlot === request.timeSlot && slot.available > 0
    );

    if (!isSlotAvailable && !request.dockDoorId) {
      throw new BadRequestException('Selected time slot is not available');
    }

    let dockDoorId = request.dockDoorId;

    if (!dockDoorId) {
      dockDoorId = await this.assignOptimalDockDoor(
        request.warehouseId,
        request.appointmentType,
        request.appointmentDate,
        request.timeSlot,
        tenantId,
      );
    }

    if (!dockDoorId) {
      throw new BadRequestException('No dock door available for selected time');
    }

    const appointmentId = `APT-${Date.now()}`;

    const appointment: Appointment = {
      id: appointmentId,
      warehouseId: request.warehouseId,
      customerId: request.customerId,
      appointmentType: request.appointmentType,
      appointmentDate: request.appointmentDate,
      timeSlot: request.timeSlot,
      dockDoorId,
      status: 'scheduled',
      vehicleType: request.vehicleType,
      palletCount: request.palletCount,
      estimatedDuration: request.estimatedDuration || this.estimateDuration(request.palletCount, request.vehicleType),
      carrierName: request.carrierName,
      driverName: request.driverName,
      driverPhone: request.driverPhone,
      vehiclePlate: request.vehiclePlate,
      poNumber: request.poNumber,
      notes: request.notes,
      createdAt: new Date(),
    };

    await this.eventBus.emit('appointment.created', {
      appointmentId: appointment.id,
      warehouseId: request.warehouseId,
      customerId: request.customerId,
      appointmentType: request.appointmentType,
      appointmentDate: request.appointmentDate,
      timeSlot: request.timeSlot,
      tenantId,
    });

    await this.cacheService.del(this.cacheService.generateKey('appointments', request.warehouseId, request.appointmentDate.toISOString()));

    return appointment;
  }

  async getAvailableTimeSlots(
    warehouseId: string,
    date: Date,
    appointmentType: 'inbound' | 'outbound',
    tenantId: string,
  ): Promise<Array<{ timeSlot: string; available: number; total: number }>> {
    const timeSlots = this.generateTimeSlots();
    const dockDoors = await this.getActiveDockDoors(warehouseId, appointmentType);
    const totalDoorsPerSlot = dockDoors.length;

    const availability: Array<{ timeSlot: string; available: number; total: number }> = [];

    for (const slot of timeSlots) {
      const booked = await this.getBookedDoorsForSlot(warehouseId, date, slot, tenantId);
      availability.push({
        timeSlot: slot,
        available: totalDoorsPerSlot - booked,
        total: totalDoorsPerSlot,
      });
    }

    return availability;
  }

  private generateTimeSlots(): string[] {
    return [
      '07:00-09:00',
      '09:00-11:00',
      '11:00-13:00',
      '13:00-15:00',
      '15:00-17:00',
      '17:00-19:00',
    ];
  }

  private async getActiveDockDoors(warehouseId: string, appointmentType: string): Promise<DockDoor[]> {
    // Mock: Would query actual dock_doors table
    return [
      {
        id: 'DOCK-01',
        warehouseId,
        doorNumber: '1',
        doorType: 'both',
        isActive: true,
      },
      {
        id: 'DOCK-02',
        warehouseId,
        doorNumber: '2',
        doorType: appointmentType === 'inbound' ? 'inbound' : 'outbound',
        isActive: true,
      },
      {
        id: 'DOCK-03',
        warehouseId,
        doorNumber: '3',
        doorType: 'both',
        isActive: true,
      },
    ];
  }

  private async getBookedDoorsForSlot(
    warehouseId: string,
    date: Date,
    timeSlot: string,
    tenantId: string,
  ): Promise<number> {
    // Mock: Would query appointments table
    return 1;
  }

  private async assignOptimalDockDoor(
    warehouseId: string,
    appointmentType: string,
    date: Date,
    timeSlot: string,
    tenantId: string,
  ): Promise<string | null> {
    const dockDoors = await this.getActiveDockDoors(warehouseId, appointmentType);
    const bookedDoors = new Set<string>(); // Would query from DB

    for (const door of dockDoors) {
      if (!bookedDoors.has(door.id)) {
        return door.id;
      }
    }

    return null;
  }

  private estimateDuration(palletCount?: number, vehicleType?: string): number {
    const baseDuration = vehicleType === 'container' ? 120 : vehicleType === 'truck' ? 90 : 60;
    const palletTime = (palletCount || 10) * 2; // 2 minutes per pallet
    return baseDuration + palletTime;
  }

  async confirmAppointment(appointmentId: string, tenantId: string, userId: string): Promise<Appointment | null> {
    // Mock update
    await this.eventBus.emit('appointment.confirmed', {
      appointmentId,
      confirmedBy: userId,
      tenantId,
    });

    return null; // Would return updated appointment
  }

  async checkInAppointment(
    appointmentId: string,
    actualVehiclePlate: string,
    actualDriverName: string,
    tenantId: string,
    userId: string,
  ): Promise<Appointment | null> {
    const checkInTime = new Date();

    await this.eventBus.emit('appointment.checked_in', {
      appointmentId,
      checkInTime,
      actualVehiclePlate,
      actualDriverName,
      checkedInBy: userId,
      tenantId,
    });

    return null;
  }

  async completeAppointment(
    appointmentId: string,
    actualPalletCount: number,
    tenantId: string,
    userId: string,
  ): Promise<Appointment | null> {
    const checkOutTime = new Date();

    await this.eventBus.emit('appointment.completed', {
      appointmentId,
      checkOutTime,
      actualPalletCount,
      completedBy: userId,
      tenantId,
    });

    return null;
  }

  async cancelAppointment(
    appointmentId: string,
    reason: string,
    tenantId: string,
    userId: string,
  ): Promise<boolean> {
    await this.eventBus.emit('appointment.cancelled', {
      appointmentId,
      reason,
      cancelledBy: userId,
      tenantId,
    });

    return true;
  }

  async getAppointments(
    warehouseId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<Appointment[]> {
    // Mock: Would query appointments table
    return [];
  }

  async getDockDoorUtilization(
    warehouseId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<any> {
    return {
      warehouseId,
      period: { startDate, endDate },
      utilizationByDoor: [],
      overallUtilization: 0,
    };
  }

  async markNoShow(appointmentId: string, tenantId: string): Promise<void> {
    await this.eventBus.emit('appointment.no_show', {
      appointmentId,
      tenantId,
    });
  }
}

