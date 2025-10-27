import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RfidTag } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class RfidService {
  constructor(
    @InjectRepository(RfidTag)
    private rfidRepository: Repository<RfidTag>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<RfidTag[]> {
    const query = this.rfidRepository.createQueryBuilder('rfid')
      .where('rfid.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('rfid.status = :status', { status: filters.status });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<RfidTag> {
    return this.rfidRepository.findOne({
      where: { id, tenantId },
      relations: ['item', 'location'],
    });
  }

  async create(rfidData: Partial<RfidTag>, tenantId: string): Promise<RfidTag> {
    const rfid = this.rfidRepository.create({
      ...rfidData,
      tenantId,
      tagId: this.generateTagId(),
      status: 'active',
    });
    return this.rfidRepository.save(rfid);
  }

  async update(id: string, rfidData: Partial<RfidTag>, tenantId: string): Promise<RfidTag> {
    await this.rfidRepository.update({ id, tenantId }, rfidData);
    return this.findOne(id, tenantId);
  }

  async scanTag(tagId: string, tenantId: string): Promise<any> {
    const tag = await this.rfidRepository.findOne({
      where: { tagId, tenantId },
      relations: ['item', 'location'],
    });

    if (!tag) {
      throw new Error('RFID tag not found');
    }

    // Update last scanned timestamp
    tag.lastScannedAt = new Date();
    await this.rfidRepository.save(tag);

    return {
      tagId: tag.tagId,
      itemId: tag.itemId,
      locationId: tag.locationId,
      status: tag.status,
      lastScannedAt: tag.lastScannedAt,
    };
  }

  async getTagHistory(tagId: string, tenantId: string): Promise<any[]> {
    const tag = await this.rfidRepository.findOne({
      where: { tagId, tenantId },
    });

    if (!tag) {
      throw new Error('RFID tag not found');
    }

    // Return scan history for the tag
    return tag.scanHistory || [];
  }

  async deactivateTag(tagId: string, tenantId: string): Promise<RfidTag> {
    const tag = await this.rfidRepository.findOne({
      where: { tagId, tenantId },
    });

    if (!tag) {
      throw new Error('RFID tag not found');
    }

    tag.status = 'inactive';
    tag.deactivatedAt = new Date();
    return this.rfidRepository.save(tag);
  }

  private generateTagId(): string {
    const timestamp = Date.now();
    return `RFID-${timestamp}`;
  }
}