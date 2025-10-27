import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Location[]> {
    const query = this.locationRepository.createQueryBuilder('location')
      .where('location.tenantId = :tenantId', { tenantId });

    if (filters?.warehouseId) {
      query.andWhere('location.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    if (filters?.zone) {
      query.andWhere('location.zone = :zone', { zone: filters.zone });
    }

    if (filters?.locationType) {
      query.andWhere('location.locationType = :locationType', { locationType: filters.locationType });
    }

    if (filters?.availableOnly) {
      query.andWhere('location.isOccupied = false');
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Location> {
    return this.locationRepository.findOne({
      where: { id, tenantId },
      relations: ['warehouse', 'item'],
    });
  }

  async create(locationData: Partial<Location>, tenantId: string): Promise<Location> {
    const location = this.locationRepository.create({
      ...locationData,
      tenantId,
      locationCode: this.generateLocationCode(locationData.zone, locationData.aisle, locationData.rack, locationData.shelf, locationData.bin),
    });
    return this.locationRepository.save(location);
  }

  async update(id: string, locationData: Partial<Location>, tenantId: string): Promise<Location> {
    await this.locationRepository.update({ id, tenantId }, locationData);
    return this.findOne(id, tenantId);
  }

  async occupyLocation(id: string, itemId: string, tenantId: string): Promise<Location> {
    const location = await this.findOne(id, tenantId);
    if (!location) {
      throw new Error('Location not found');
    }

    if (location.isOccupied) {
      throw new Error('Location is already occupied');
    }

    location.isOccupied = true;
    location.itemId = itemId;
    location.occupiedAt = new Date();
    return this.locationRepository.save(location);
  }

  async releaseLocation(id: string, tenantId: string): Promise<Location> {
    const location = await this.findOne(id, tenantId);
    if (!location) {
      throw new Error('Location not found');
    }

    location.isOccupied = false;
    location.itemId = null;
    location.releasedAt = new Date();
    return this.locationRepository.save(location);
  }

  async getLocationStats(warehouseId: string, tenantId: string): Promise<any> {
    const locations = await this.locationRepository.find({
      where: { warehouseId, tenantId },
    });

    const total = locations.length;
    const occupied = locations.filter(loc => loc.isOccupied).length;
    const available = total - occupied;
    const utilizationRate = total > 0 ? (occupied / total) * 100 : 0;

    return {
      total,
      occupied,
      available,
      utilizationRate,
    };
  }

  private generateLocationCode(zone: string, aisle: string, rack: string, shelf: string, bin: string): string {
    return `${zone}-${aisle}-${rack}-${shelf}-${bin}`;
  }
}