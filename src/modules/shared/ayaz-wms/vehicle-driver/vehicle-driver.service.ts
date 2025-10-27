import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Vehicle and Driver Management Service
 * Full implementation: Vehicle types, vehicles, drivers, carriers, assignments, inspections
 */

export interface VehicleType {
  id: string;
  code: string;
  name: string;
  nameTr: string;
  category: 'TRUCK' | 'VAN' | 'TRAILER' | 'CONTAINER';
  maxWeight: number;
  maxVolume: number;
  dimensions: { length: number; width: number; height: number };
  requiresSpecialHandling: boolean;
  isActive: boolean;
}

export interface Vehicle {
  id: string;
  vehicleTypeId: string;
  licensePlate: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  ownershipType: 'OWNED' | 'LEASED' | 'CONTRACTED';
  carrierId?: string;
  currentStatus: 'AVAILABLE' | 'IN_TRANSIT' | 'AT_DOCK' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  lastInspectionDate?: Date;
  nextInspectionDate?: Date;
  insuranceExpiry?: Date;
  registrationExpiry?: Date;
  gpsTrackingId?: string;
  temperatureControlled: boolean;
  hazmatCertified: boolean;
  maxCapacityKg?: number;
  maxCapacityM3?: number;
  documentation?: any[];
  notes?: string;
  isActive: boolean;
}

export interface Driver {
  id: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: Date;
  hazmatCertified: boolean;
  medicalCertificateExpiry?: Date;
  carrierId?: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR';
  currentStatus: 'AVAILABLE' | 'ON_DUTY' | 'OFF_DUTY' | 'ON_BREAK' | 'ON_LEAVE';
  assignedVehicleId?: string;
  performanceRating?: number;
  isActive: boolean;
}

export interface Carrier {
  id: string;
  code: string;
  name: string;
  legalName?: string;
  taxId?: string;
  dotNumber?: string;
  mcNumber?: string;
  scacCode?: string;
  carrierType: 'LTL' | 'FTL' | 'PARCEL' | 'COURIER' | '3PL';
  serviceTypes: string[];
  email?: string;
  phone?: string;
  contactPerson?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  performanceRating?: number;
  onTimeDeliveryRate?: number;
  preferredCarrier: boolean;
  blacklisted: boolean;
  paymentTerms?: string;
  isActive: boolean;
}

@Injectable()
export class VehicleDriverService {
  private vehicleTypes: Map<string, VehicleType> = new Map();
  private vehicles: Map<string, Vehicle> = new Map();
  private drivers: Map<string, Driver> = new Map();
  private carriers: Map<string, Carrier> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Mock vehicle types
    const type1: VehicleType = {
      id: 'VT-001',
      code: 'TRUCK-MEDIUM',
      name: 'Medium Truck',
      nameTr: 'Orta Boy Kamyon',
      category: 'TRUCK',
      maxWeight: 5000,
      maxVolume: 30,
      dimensions: { length: 6, width: 2.4, height: 2.6 },
      requiresSpecialHandling: false,
      isActive: true,
    };
    this.vehicleTypes.set(type1.id, type1);

    // Mock carriers
    const carrier1: Carrier = {
      id: 'CAR-001',
      code: 'ARAS',
      name: 'Aras Kargo',
      carrierType: 'PARCEL',
      serviceTypes: ['GROUND', 'EXPRESS'],
      phone: '+90-212-XXX-XXXX',
      performanceRating: 4.5,
      onTimeDeliveryRate: 96.5,
      preferredCarrier: true,
      blacklisted: false,
      isActive: true,
    };
    this.carriers.set(carrier1.id, carrier1);
  }

  // ========== VEHICLE TYPE MANAGEMENT ==========

  async createVehicleType(data: Omit<VehicleType, 'id'>): Promise<VehicleType> {
    const id = `VT-${Date.now()}`;
    const vehicleType: VehicleType = { ...data, id };
    this.vehicleTypes.set(id, vehicleType);

    await this.eventEmitter.emitAsync('vehicle.type.created', vehicleType);
    return vehicleType;
  }

  getVehicleType(id: string): VehicleType {
    const type = this.vehicleTypes.get(id);
    if (!type) {
      throw new NotFoundException('Vehicle type not found');
    }
    return type;
  }

  getAllVehicleTypes(): VehicleType[] {
    return Array.from(this.vehicleTypes.values()).filter((vt) => vt.isActive);
  }

  async updateVehicleType(id: string, updates: Partial<VehicleType>): Promise<VehicleType> {
    const type = this.getVehicleType(id);
    Object.assign(type, updates);
    await this.eventEmitter.emitAsync('vehicle.type.updated', type);
    return type;
  }

  // ========== VEHICLE MANAGEMENT ==========

  async createVehicle(data: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    // Validate license plate uniqueness
    const existing = Array.from(this.vehicles.values()).find((v) => v.licensePlate === data.licensePlate);
    if (existing) {
      throw new BadRequestException('License plate already exists');
    }

    const id = `VEH-${Date.now()}`;
    const vehicle: Vehicle = { ...data, id };
    this.vehicles.set(id, vehicle);

    await this.eventEmitter.emitAsync('vehicle.created', vehicle);
    return vehicle;
  }

  getVehicle(id: string): Vehicle {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  getVehicleByLicensePlate(licensePlate: string): Vehicle {
    const vehicle = Array.from(this.vehicles.values()).find((v) => v.licensePlate === licensePlate);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  getAllVehicles(filters?: { status?: string; carrierId?: string }): Vehicle[] {
    let vehicles = Array.from(this.vehicles.values()).filter((v) => v.isActive);

    if (filters?.status) {
      vehicles = vehicles.filter((v) => v.currentStatus === filters.status);
    }

    if (filters?.carrierId) {
      vehicles = vehicles.filter((v) => v.carrierId === filters.carrierId);
    }

    return vehicles;
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const vehicle = this.getVehicle(id);
    Object.assign(vehicle, updates);
    await this.eventEmitter.emitAsync('vehicle.updated', vehicle);
    return vehicle;
  }

  async updateVehicleStatus(id: string, status: Vehicle['currentStatus'], reason?: string): Promise<Vehicle> {
    const vehicle = this.getVehicle(id);
    const oldStatus = vehicle.currentStatus;
    vehicle.currentStatus = status;

    await this.eventEmitter.emitAsync('vehicle.status.changed', {
      vehicleId: id,
      oldStatus,
      newStatus: status,
      reason,
    });

    return vehicle;
  }

  async recordVehicleInspection(params: {
    vehicleId: string;
    inspectionType: 'PRE_TRIP' | 'POST_TRIP' | 'ANNUAL' | 'SAFETY';
    result: 'PASS' | 'FAIL' | 'CONDITIONAL';
    findings?: any[];
    inspectedBy: string;
  }): Promise<void> {
    const vehicle = this.getVehicle(params.vehicleId);

    if (params.result === 'PASS') {
      vehicle.lastInspectionDate = new Date();
      // Set next inspection based on type
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + (params.inspectionType === 'ANNUAL' ? 12 : 1));
      vehicle.nextInspectionDate = nextDate;
    } else if (params.result === 'FAIL') {
      vehicle.currentStatus = 'MAINTENANCE';
    }

    await this.eventEmitter.emitAsync('vehicle.inspection.recorded', params);
  }

  // ========== DRIVER MANAGEMENT ==========

  async createDriver(data: Omit<Driver, 'id'>): Promise<Driver> {
    // Validate license number uniqueness
    const existing = Array.from(this.drivers.values()).find((d) => d.licenseNumber === data.licenseNumber);
    if (existing) {
      throw new BadRequestException('License number already exists');
    }

    // Validate license not expired
    if (data.licenseExpiry < new Date()) {
      throw new BadRequestException('Driver license is expired');
    }

    const id = `DRV-${Date.now()}`;
    const driver: Driver = { ...data, id };
    this.drivers.set(id, driver);

    await this.eventEmitter.emitAsync('driver.created', driver);
    return driver;
  }

  getDriver(id: string): Driver {
    const driver = this.drivers.get(id);
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }
    return driver;
  }

  getDriverByLicenseNumber(licenseNumber: string): Driver {
    const driver = Array.from(this.drivers.values()).find((d) => d.licenseNumber === licenseNumber);
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }
    return driver;
  }

  getAllDrivers(filters?: { status?: string; carrierId?: string }): Driver[] {
    let drivers = Array.from(this.drivers.values()).filter((d) => d.isActive);

    if (filters?.status) {
      drivers = drivers.filter((d) => d.currentStatus === filters.status);
    }

    if (filters?.carrierId) {
      drivers = drivers.filter((d) => d.carrierId === filters.carrierId);
    }

    return drivers;
  }

  async updateDriver(id: string, updates: Partial<Driver>): Promise<Driver> {
    const driver = this.getDriver(id);
    Object.assign(driver, updates);
    await this.eventEmitter.emitAsync('driver.updated', driver);
    return driver;
  }

  async updateDriverStatus(id: string, status: Driver['currentStatus'], reason?: string): Promise<Driver> {
    const driver = this.getDriver(id);
    const oldStatus = driver.currentStatus;
    driver.currentStatus = status;

    await this.eventEmitter.emitAsync('driver.status.changed', {
      driverId: id,
      oldStatus,
      newStatus: status,
      reason,
    });

    return driver;
  }

  async assignVehicleToDriver(driverId: string, vehicleId: string): Promise<void> {
    const driver = this.getDriver(driverId);
    const vehicle = this.getVehicle(vehicleId);

    // Check if driver already has a vehicle
    if (driver.assignedVehicleId) {
      throw new BadRequestException('Driver already has an assigned vehicle');
    }

    // Check if vehicle is available
    if (vehicle.currentStatus !== 'AVAILABLE') {
      throw new BadRequestException('Vehicle is not available');
    }

    driver.assignedVehicleId = vehicleId;
    vehicle.currentStatus = 'IN_TRANSIT';

    await this.eventEmitter.emitAsync('vehicle.assigned', {
      driverId,
      vehicleId,
      assignedAt: new Date(),
    });
  }

  async unassignVehicleFromDriver(driverId: string, reason?: string): Promise<void> {
    const driver = this.getDriver(driverId);

    if (!driver.assignedVehicleId) {
      throw new BadRequestException('Driver has no assigned vehicle');
    }

    const vehicleId = driver.assignedVehicleId;
    const vehicle = this.getVehicle(vehicleId);

    driver.assignedVehicleId = undefined;
    vehicle.currentStatus = 'AVAILABLE';

    await this.eventEmitter.emitAsync('vehicle.unassigned', {
      driverId,
      vehicleId,
      reason,
      unassignedAt: new Date(),
    });
  }

  async checkDriverCompliance(driverId: string): Promise<{
    isCompliant: boolean;
    issues: string[];
  }> {
    const driver = this.getDriver(driverId);
    const issues: string[] = [];

    // Check license expiry
    if (driver.licenseExpiry < new Date()) {
      issues.push('Driver license expired');
    } else if (driver.licenseExpiry < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      issues.push('Driver license expiring within 30 days');
    }

    // Check medical certificate
    if (driver.medicalCertificateExpiry && driver.medicalCertificateExpiry < new Date()) {
      issues.push('Medical certificate expired');
    }

    return {
      isCompliant: issues.length === 0,
      issues,
    };
  }

  // ========== CARRIER MANAGEMENT ==========

  async createCarrier(data: Omit<Carrier, 'id'>): Promise<Carrier> {
    // Validate code uniqueness
    const existing = Array.from(this.carriers.values()).find((c) => c.code === data.code);
    if (existing) {
      throw new BadRequestException('Carrier code already exists');
    }

    const id = `CAR-${Date.now()}`;
    const carrier: Carrier = { ...data, id };
    this.carriers.set(id, carrier);

    await this.eventEmitter.emitAsync('carrier.created', carrier);
    return carrier;
  }

  getCarrier(id: string): Carrier {
    const carrier = this.carriers.get(id);
    if (!carrier) {
      throw new NotFoundException('Carrier not found');
    }
    return carrier;
  }

  getCarrierByCode(code: string): Carrier {
    const carrier = Array.from(this.carriers.values()).find((c) => c.code === code);
    if (!carrier) {
      throw new NotFoundException('Carrier not found');
    }
    return carrier;
  }

  getAllCarriers(filters?: { carrierType?: string; preferredOnly?: boolean }): Carrier[] {
    let carriers = Array.from(this.carriers.values()).filter((c) => c.isActive && !c.blacklisted);

    if (filters?.carrierType) {
      carriers = carriers.filter((c) => c.carrierType === filters.carrierType);
    }

    if (filters?.preferredOnly) {
      carriers = carriers.filter((c) => c.preferredCarrier);
    }

    return carriers;
  }

  async updateCarrier(id: string, updates: Partial<Carrier>): Promise<Carrier> {
    const carrier = this.getCarrier(id);
    Object.assign(carrier, updates);
    await this.eventEmitter.emitAsync('carrier.updated', carrier);
    return carrier;
  }

  async updateCarrierPerformance(id: string, metrics: {
    onTimeDeliveryRate?: number;
    performanceRating?: number;
  }): Promise<Carrier> {
    const carrier = this.getCarrier(id);
    Object.assign(carrier, metrics);

    await this.eventEmitter.emitAsync('carrier.performance.updated', {
      carrierId: id,
      metrics,
    });

    return carrier;
  }

  async blacklistCarrier(id: string, reason: string): Promise<void> {
    const carrier = this.getCarrier(id);
    carrier.blacklisted = true;
    carrier.preferredCarrier = false;

    await this.eventEmitter.emitAsync('carrier.blacklisted', {
      carrierId: id,
      reason,
    });
  }

  async removeFromBlacklist(id: string): Promise<void> {
    const carrier = this.getCarrier(id);
    carrier.blacklisted = false;

    await this.eventEmitter.emitAsync('carrier.blacklist.removed', {
      carrierId: id,
    });
  }

  // ========== STATISTICS & REPORTS ==========

  getVehicleStatistics(): {
    total: number;
    available: number;
    inTransit: number;
    atDock: number;
    maintenance: number;
    outOfService: number;
  } {
    const vehicles = Array.from(this.vehicles.values()).filter((v) => v.isActive);

    return {
      total: vehicles.length,
      available: vehicles.filter((v) => v.currentStatus === 'AVAILABLE').length,
      inTransit: vehicles.filter((v) => v.currentStatus === 'IN_TRANSIT').length,
      atDock: vehicles.filter((v) => v.currentStatus === 'AT_DOCK').length,
      maintenance: vehicles.filter((v) => v.currentStatus === 'MAINTENANCE').length,
      outOfService: vehicles.filter((v) => v.currentStatus === 'OUT_OF_SERVICE').length,
    };
  }

  getDriverStatistics(): {
    total: number;
    available: number;
    onDuty: number;
    offDuty: number;
    onBreak: number;
    onLeave: number;
  } {
    const drivers = Array.from(this.drivers.values()).filter((d) => d.isActive);

    return {
      total: drivers.length,
      available: drivers.filter((d) => d.currentStatus === 'AVAILABLE').length,
      onDuty: drivers.filter((d) => d.currentStatus === 'ON_DUTY').length,
      offDuty: drivers.filter((d) => d.currentStatus === 'OFF_DUTY').length,
      onBreak: drivers.filter((d) => d.currentStatus === 'ON_BREAK').length,
      onLeave: drivers.filter((d) => d.currentStatus === 'ON_LEAVE').length,
    };
  }

  getExpiringSoon(days: number = 30): {
    vehicles: { id: string; licensePlate: string; type: string; expiryDate: Date }[];
    drivers: { id: string; name: string; type: string; expiryDate: Date }[];
  } {
    const cutoffDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const vehicles: any[] = [];
    const drivers: any[] = [];

    // Check vehicle documents
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.insuranceExpiry && vehicle.insuranceExpiry < cutoffDate) {
        vehicles.push({
          id: vehicle.id,
          licensePlate: vehicle.licensePlate,
          type: 'Insurance',
          expiryDate: vehicle.insuranceExpiry,
        });
      }
      if (vehicle.registrationExpiry && vehicle.registrationExpiry < cutoffDate) {
        vehicles.push({
          id: vehicle.id,
          licensePlate: vehicle.licensePlate,
          type: 'Registration',
          expiryDate: vehicle.registrationExpiry,
        });
      }
    }

    // Check driver licenses
    for (const driver of this.drivers.values()) {
      if (driver.licenseExpiry < cutoffDate) {
        drivers.push({
          id: driver.id,
          name: `${driver.firstName} ${driver.lastName}`,
          type: 'License',
          expiryDate: driver.licenseExpiry,
        });
      }
      if (driver.medicalCertificateExpiry && driver.medicalCertificateExpiry < cutoffDate) {
        drivers.push({
          id: driver.id,
          name: `${driver.firstName} ${driver.lastName}`,
          type: 'Medical Certificate',
          expiryDate: driver.medicalCertificateExpiry,
        });
      }
    }

    return { vehicles, drivers };
  }
}

