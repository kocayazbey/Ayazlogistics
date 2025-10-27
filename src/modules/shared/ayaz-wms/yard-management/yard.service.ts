import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';

/**
 * Araç Sahası Yönetimi (Yard Management)
 * Vehicle yard and dock management - Missing in AyazWMS
 */

interface Vehicle {
  vehicleId: string;
  plate: string;
  type: 'truck' | 'trailer' | 'van';
  carrier: string;
  driver: {
    name: string;
    phone: string;
    licenseNumber: string;
  };
  status: 'waiting' | 'at_dock' | 'loading' | 'unloading' | 'departed';
  arrivalTime: Date;
  appointmentTime?: Date;
  assignedDock?: string;
}

interface Dock {
  dockId: string;
  dockNumber: string;
  type: 'receiving' | 'shipping' | 'both';
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  currentVehicle?: string;
  scheduledVehicles: Array<{
    vehicleId: string;
    scheduledTime: Date;
  }>;
}

interface YardLocation {
  locationId: string;
  locationCode: string;
  type: 'parking' | 'waiting' | 'staging';
  status: 'available' | 'occupied';
  currentVehicle?: string;
}

@Injectable()
export class YardManagementService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly wsGateway: WebSocketGateway,
  ) {}

  /**
   * Araç Giriş İşlemi
   * Vehicle check-in to yard
   */
  async checkInVehicle(data: {
    plate: string;
    type: 'truck' | 'trailer' | 'van';
    carrier: string;
    driverName: string;
    driverPhone: string;
    driverLicense: string;
    purpose: 'delivery' | 'pickup';
    appointmentNumber?: string;
    warehouseId: string;
  }, userId: string) {
    const vehicleId = `VEH-${Date.now()}`;

    const vehicle: Vehicle = {
      vehicleId,
      plate: data.plate,
      type: data.type,
      carrier: data.carrier,
      driver: {
        name: data.driverName,
        phone: data.driverPhone,
        licenseNumber: data.driverLicense,
      },
      status: 'waiting',
      arrivalTime: new Date(),
    };

    // Check if has appointment
    if (data.appointmentNumber) {
      const appointment = await this.getAppointment(data.appointmentNumber, data.warehouseId);
      
      if (appointment) {
        vehicle.appointmentTime = appointment.scheduledTime;
        vehicle.assignedDock = appointment.dockNumber;
      }
    }

    // Assign to yard location
    const yardLocation = await this.assignYardLocation(vehicleId, data.warehouseId);

    await this.eventBus.emit('vehicle.checked.in', {
      vehicleId,
      plate: data.plate,
      purpose: data.purpose,
      hasAppointment: !!data.appointmentNumber,
      yardLocation: yardLocation.locationCode,
    });

    this.wsGateway.sendToRoom(`warehouse:${data.warehouseId}`, 'yard:vehicle:checkin', {
      vehicle,
      yardLocation,
    });

    return {
      vehicleId,
      vehicle,
      yardLocation,
      estimatedWaitTime: this.calculateWaitTime(data.warehouseId, data.purpose),
    };
  }

  /**
   * Araç Çıkış İşlemi
   * Vehicle check-out from yard
   */
  async checkOutVehicle(data: {
    vehicleId: string;
    warehouseId: string;
  }, userId: string) {
    await this.eventBus.emit('vehicle.checked.out', {
      vehicleId: data.vehicleId,
      warehouseId: data.warehouseId,
      userId,
    });

    return {
      vehicleId: data.vehicleId,
      status: 'departed',
      departureTime: new Date(),
    };
  }

  /**
   * Araç Rezervasyon Onay
   * Approve vehicle dock reservation
   */
  async approveReservation(data: {
    vehicleId: string;
    dockNumber: string;
    scheduledTime: Date;
    warehouseId: string;
  }, userId: string) {
    const dock = await this.getDockByNumber(data.dockNumber, data.warehouseId);

    if (dock.status === 'occupied') {
      throw new BadRequestException(`Dock ${data.dockNumber} is currently occupied`);
    }

    // Check if slot is available
    const conflicts = dock.scheduledVehicles.filter(
      (v) => Math.abs(v.scheduledTime.getTime() - data.scheduledTime.getTime()) < 3600000,
    );

    if (conflicts.length > 0) {
      throw new BadRequestException('Time slot conflicts with existing reservation');
    }

    const reservationId = `RES-${Date.now()}`;

    await this.eventBus.emit('dock.reserved', {
      reservationId,
      vehicleId: data.vehicleId,
      dockNumber: data.dockNumber,
      scheduledTime: data.scheduledTime,
    });

    return {
      reservationId,
      vehicleId: data.vehicleId,
      dockNumber: data.dockNumber,
      scheduledTime: data.scheduledTime,
      approvedBy: userId,
      approvedAt: new Date(),
    };
  }

  /**
   * Araca Yükleme Yap
   * Load pallets/cartons to vehicle
   */
  async loadToVehicle(data: {
    vehicleId: string;
    dockNumber: string;
    items: Array<{
      type: 'pallet' | 'carton';
      id: string;
      quantity?: number;
    }>;
    warehouseId: string;
  }, userId: string) {
    const loadId = `LOAD-${Date.now()}`;

    await this.eventBus.emit('vehicle.loading', {
      loadId,
      vehicleId: data.vehicleId,
      dockNumber: data.dockNumber,
      itemCount: data.items.length,
    });

    this.wsGateway.sendToRoom(`warehouse:${data.warehouseId}`, 'vehicle:loading', {
      loadId,
      vehicleId: data.vehicleId,
      progress: 0,
    });

    return {
      loadId,
      vehicleId: data.vehicleId,
      dockNumber: data.dockNumber,
      totalItems: data.items.length,
      loadedItems: 0,
      status: 'loading',
      startedAt: new Date(),
      startedBy: userId,
    };
  }

  /**
   * Araç Sahası İzleme
   * Monitor yard status
   */
  async monitorYard(warehouseId: string) {
    // Mock implementation
    return {
      warehouseId,
      totalVehicles: 0,
      waiting: 0,
      atDock: 0,
      loading: 0,
      unloading: 0,
      vehicles: [],
      docks: [],
      yardLocations: [],
      avgWaitTime: 0,
      oldestWaitTime: 0,
    };
  }

  /**
   * Kapı Bilgileri Tanımlama
   * Define dock/gate information
   */
  async defineDock(data: {
    dockNumber: string;
    type: 'receiving' | 'shipping' | 'both';
    maxVehicleSize: 'small' | 'medium' | 'large';
    hasLevelingDock: boolean;
    hasRamp: boolean;
    warehouseId: string;
  }) {
    const dockId = `DOCK-${data.dockNumber}`;

    await this.eventBus.emit('dock.defined', {
      dockId,
      dockNumber: data.dockNumber,
      warehouseId: data.warehouseId,
    });

    return {
      dockId,
      ...data,
      status: 'available',
      createdAt: new Date(),
    };
  }

  // Helper methods
  private async getAppointment(appointmentNumber: string, warehouseId: string) {
    // Would query appointments table
    return null;
  }

  private async assignYardLocation(vehicleId: string, warehouseId: string) {
    // Would find available yard parking spot
    return {
      locationId: 'YARD-001',
      locationCode: 'Y-001',
      type: 'waiting' as const,
      status: 'occupied' as const,
      currentVehicle: vehicleId,
    };
  }

  private async getDockByNumber(dockNumber: string, warehouseId: string): Promise<Dock> {
    // Mock - would query docks table
    return {
      dockId: `DOCK-${dockNumber}`,
      dockNumber,
      type: 'both',
      status: 'available',
      scheduledVehicles: [],
    };
  }

  private calculateWaitTime(warehouseId: string, purpose: string): number {
    // Mock - would calculate based on current queue
    return 30; // minutes
  }
}

