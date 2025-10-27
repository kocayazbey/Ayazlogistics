import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, or, desc, asc } from 'drizzle-orm';
import { drivers, vehicles, assignments } from '../../../database/schema/logistics/tms.schema';
import { CreateDriverDto, UpdateDriverDto, DriverQueryDto } from './dto/driver.dto';

@Injectable()
export class DriversService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async create(createDriverDto: CreateDriverDto) {
    try {
      const [driver] = await this.db
        .insert(drivers)
        .values({
          ...createDriverDto,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return driver;
    } catch (error) {
      throw new BadRequestException('Driver creation failed');
    }
  }

  async findAll(query: DriverQueryDto) {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(
        or(
          eq(drivers.firstName, search),
          eq(drivers.lastName, search),
          eq(drivers.licenseNumber, search),
          eq(drivers.phone, search)
        )
      );
    }
    
    if (status) {
      whereConditions.push(eq(drivers.isActive, status === 'active'));
    }

    const [driversList, total] = await Promise.all([
      this.db
        .select()
        .from(drivers)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(sortOrder === 'desc' ? desc(drivers[sortBy]) : asc(drivers[sortBy]))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: drivers.id })
        .from(drivers)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    ]);

    return {
      data: driversList,
      pagination: {
        page,
        limit,
        total: total.length,
        totalPages: Math.ceil(total.length / limit),
      },
    };
  }

  async findOne(id: string) {
    const [driver] = await this.db
      .select()
      .from(drivers)
      .where(eq(drivers.id, id))
      .limit(1);

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async update(id: string, updateDriverDto: UpdateDriverDto) {
    const [driver] = await this.db
      .update(drivers)
      .set({
        ...updateDriverDto,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, id))
      .returning();

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async remove(id: string) {
    const [driver] = await this.db
      .update(drivers)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, id))
      .returning();

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return { message: 'Driver deactivated successfully' };
  }

  async assignVehicle(driverId: string, vehicleId: string) {
    // Check if driver exists
    const driver = await this.findOne(driverId);
    
    // Check if vehicle exists and is available
    const [vehicle] = await this.db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.isActive, true)))
      .limit(1);

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found or not available');
    }

    // Update driver's vehicle assignment
    const [updatedDriver] = await this.db
      .update(drivers)
      .set({
        vehicleId,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, driverId))
      .returning();

    return updatedDriver;
  }

  async updatePerformance(driverId: string, performanceData: any) {
    const driver = await this.findOne(driverId);
    
    const [updatedDriver] = await this.db
      .update(drivers)
      .set({
        performanceScore: performanceData.score,
        performanceNotes: performanceData.notes,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, driverId))
      .returning();

    return updatedDriver;
  }

  async getAssignments(driverId: string) {
    const driver = await this.findOne(driverId);
    
    const assignmentsList = await this.db
      .select()
      .from(assignments)
      .where(eq(assignments.driverId, driverId))
      .orderBy(desc(assignments.createdAt));

    return assignmentsList;
  }
}
