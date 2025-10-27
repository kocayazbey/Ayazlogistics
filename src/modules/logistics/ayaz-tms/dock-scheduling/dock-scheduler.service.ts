import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface DockAppointment {
  id: string;
  dockId: string;
  vehicleId: string;
  driverId: string;
  appointmentType: 'inbound' | 'outbound';
  scheduledTime: Date;
  estimatedDuration: number;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled';
  actualCheckIn?: Date;
  actualCheckOut?: Date;
  detention?: number;
}

interface DockDoor {
  id: string;
  warehouseId: string;
  dockNumber: string;
  type: 'inbound' | 'outbound' | 'both';
  capabilities: string[];
  status: 'available' | 'occupied' | 'maintenance';
}

@Injectable()
export class DockSchedulerService {
  private dockDoors: DockDoor[] = [
    { id: 'dock-1', warehouseId: 'wh-1', dockNumber: 'D01', type: 'inbound', capabilities: ['forklift', 'pallet_jack'], status: 'available' },
    { id: 'dock-2', warehouseId: 'wh-1', dockNumber: 'D02', type: 'inbound', capabilities: ['forklift'], status: 'available' },
    { id: 'dock-3', warehouseId: 'wh-1', dockNumber: 'D03', type: 'outbound', capabilities: ['forklift', 'conveyor'], status: 'available' },
    { id: 'dock-4', warehouseId: 'wh-1', dockNumber: 'D04', type: 'outbound', capabilities: ['forklift'], status: 'available' },
    { id: 'dock-5', warehouseId: 'wh-1', dockNumber: 'D05', type: 'both', capabilities: ['forklift', 'pallet_jack', 'liftgate'], status: 'available' },
  ];

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async scheduleAppointment(request: {
    vehicleId: string;
    driverId: string;
    appointmentType: 'inbound' | 'outbound';
    preferredTime: Date;
    estimatedDuration: number;
    requirements?: string[];
  }): Promise<DockAppointment> {
    const availableDock = await this.findAvailableDock(
      request.appointmentType,
      request.preferredTime,
      request.estimatedDuration,
      request.requirements
    );

    if (!availableDock) {
      throw new Error('No available dock at requested time');
    }

    const appointment: DockAppointment = {
      id: `APPT-${Date.now()}`,
      dockId: availableDock.id,
      vehicleId: request.vehicleId,
      driverId: request.driverId,
      appointmentType: request.appointmentType,
      scheduledTime: request.preferredTime,
      estimatedDuration: request.estimatedDuration,
      status: 'scheduled'
    };

    await this.eventBus.publish('dock.appointment.scheduled', {
      appointmentId: appointment.id,
      dockId: availableDock.id,
      scheduledTime: request.preferredTime
    });

    return appointment;
  }

  private async findAvailableDock(
    type: 'inbound' | 'outbound',
    time: Date,
    duration: number,
    requirements?: string[]
  ): Promise<DockDoor | null> {
    const eligibleDocks = this.dockDoors.filter(
      d => (d.type === type || d.type === 'both') && 
           d.status === 'available' &&
           (!requirements || requirements.every(req => d.capabilities.includes(req)))
    );

    return eligibleDocks[0] || null;
  }

  async checkInVehicle(appointmentId: string): Promise<DockAppointment> {
    const appointment = await this.getAppointment(appointmentId);
    
    appointment.status = 'checked_in';
    appointment.actualCheckIn = new Date();

    const scheduledTime = appointment.scheduledTime.getTime();
    const actualTime = appointment.actualCheckIn.getTime();
    const earlyLateMinutes = (actualTime - scheduledTime) / 60000;

    await this.eventBus.publish('dock.vehicle.checked_in', {
      appointmentId,
      earlyLateMinutes,
      onTime: Math.abs(earlyLateMinutes) <= 15
    });

    return appointment;
  }

  async startUnloading(appointmentId: string): Promise<DockAppointment> {
    const appointment = await this.getAppointment(appointmentId);
    appointment.status = 'in_progress';

    await this.eventBus.publish('dock.unloading.started', { appointmentId });
    return appointment;
  }

  async completeAppointment(appointmentId: string): Promise<DockAppointment> {
    const appointment = await this.getAppointment(appointmentId);
    appointment.status = 'completed';
    appointment.actualCheckOut = new Date();

    if (appointment.actualCheckIn && appointment.actualCheckOut) {
      const duration = (appointment.actualCheckOut.getTime() - appointment.actualCheckIn.getTime()) / 60000;
      appointment.detention = Math.max(0, duration - appointment.estimatedDuration);
    }

    await this.eventBus.publish('dock.appointment.completed', {
      appointmentId,
      detention: appointment.detention
    });

    return appointment;
  }

  private async getAppointment(id: string): Promise<DockAppointment> {
    return {
      id,
      dockId: 'dock-1',
      vehicleId: 'vehicle-1',
      driverId: 'driver-1',
      appointmentType: 'inbound',
      scheduledTime: new Date(),
      estimatedDuration: 60,
      status: 'scheduled'
    };
  }

  async getDockUtilization(warehouseId: string, date: Date): Promise<any> {
    return {
      warehouseId,
      date,
      totalDocks: 5,
      inboundDocks: 2,
      outboundDocks: 2,
      flexDocks: 1,
      appointments: 23,
      averageUtilization: 78,
      peakHours: ['08:00-10:00', '14:00-16:00'],
      availableSlots: 12
    };
  }

  async optimizeSchedule(appointments: any[]): Promise<any> {
    return {
      optimizedSchedule: appointments,
      utilizationImprovement: 15,
      detentionReduction: 25,
      recommendation: 'Shift 3 appointments to off-peak hours'
    };
  }
}

