import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, or, desc, asc, sql } from 'drizzle-orm';
import { locations } from '../../database/schema/shared/locations.schema';
import { CreateLocationDto, UpdateLocationDto, LocationQueryDto } from './dto/location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async create(createLocationDto: CreateLocationDto) {
    try {
      const [location] = await this.db
        .insert(locations)
        .values({
          ...createLocationDto,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return location;
    } catch (error) {
      throw new BadRequestException('Location creation failed');
    }
  }

  async findAll(query: LocationQueryDto) {
    const { page = 1, limit = 10, search, type, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(
        or(
          eq(locations.name, search),
          eq(locations.address, search),
          eq(locations.city, search),
          eq(locations.postalCode, search)
        )
      );
    }
    
    if (type) {
      whereConditions.push(eq(locations.type, type));
    }

    const [locationsList, total] = await Promise.all([
      this.db
        .select()
        .from(locations)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(sortOrder === 'desc' ? desc(locations[sortBy]) : asc(locations[sortBy]))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: locations.id })
        .from(locations)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    ]);

    return {
      data: locationsList,
      pagination: {
        page,
        limit,
        total: total.length,
        totalPages: Math.ceil(total.length / limit),
      },
    };
  }

  async findOne(id: string) {
    const [location] = await this.db
      .select()
      .from(locations)
      .where(eq(locations.id, id))
      .limit(1);

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  async update(id: string, updateLocationDto: UpdateLocationDto) {
    const [location] = await this.db
      .update(locations)
      .set({
        ...updateLocationDto,
        updatedAt: new Date(),
      })
      .where(eq(locations.id, id))
      .returning();

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  async remove(id: string) {
    const [location] = await this.db
      .update(locations)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(locations.id, id))
      .returning();

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return { message: 'Location deactivated successfully' };
  }

  async findNearby(lat: number, lng: number, radius: number = 10) {
    const locationsList = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.isActive, true),
          sql`ST_DWithin(
            ST_Point(${lng}, ${lat})::geography,
            ST_Point(longitude, latitude)::geography,
            ${radius * 1000}
          )`
        )
      )
      .orderBy(sql`ST_Distance(
        ST_Point(${lng}, ${lat})::geography,
        ST_Point(longitude, latitude)::geography
      )`);

    return locationsList;
  }

  async searchByAddress(address: string) {
    const locationsList = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.isActive, true),
          or(
            sql`address ILIKE ${`%${address}%`}`,
            sql`city ILIKE ${`%${address}%`}`,
            sql`postal_code ILIKE ${`%${address}%`}`
          )
        )
      )
      .limit(20);

    return locationsList;
  }
}
