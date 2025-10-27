import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(Shipment)
    private shipmentRepository: Repository<Shipment>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Shipment[]> {
    const query = this.shipmentRepository.createQueryBuilder('shipment')
      .where('shipment.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('shipment.status = :status', { status: filters.status });
    }

    if (filters?.warehouseId) {
      query.andWhere('shipment.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Shipment> {
    return this.shipmentRepository.findOne({
      where: { id, tenantId },
      relations: ['items', 'warehouse', 'carrier'],
    });
  }

  async create(shipmentData: Partial<Shipment>, tenantId: string): Promise<Shipment> {
    const shipment = this.shipmentRepository.create({
      ...shipmentData,
      tenantId,
      trackingNumber: this.generateTrackingNumber(),
      status: 'pending',
    });
    return this.shipmentRepository.save(shipment);
  }

  async update(id: string, shipmentData: Partial<Shipment>, tenantId: string): Promise<Shipment> {
    await this.shipmentRepository.update({ id, tenantId }, shipmentData);
    return this.findOne(id, tenantId);
  }

  async ship(id: string, tenantId: string): Promise<Shipment> {
    const shipment = await this.findOne(id, tenantId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }

    shipment.status = 'shipped';
    shipment.shippedAt = new Date();
    return this.shipmentRepository.save(shipment);
  }

  async deliver(id: string, tenantId: string): Promise<Shipment> {
    const shipment = await this.findOne(id, tenantId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }

    shipment.status = 'delivered';
    shipment.deliveredAt = new Date();
    return this.shipmentRepository.save(shipment);
  }

  async getTrackingInfo(trackingNumber: string, tenantId: string): Promise<any> {
    const shipment = await this.shipmentRepository.findOne({
      where: { trackingNumber, tenantId },
    });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    return {
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      currentLocation: shipment.currentLocation,
      estimatedDelivery: shipment.estimatedDelivery,
      trackingHistory: shipment.trackingHistory || [],
    };
  }

  private generateTrackingNumber(): string {
    const timestamp = Date.now();
    return `TRK-${timestamp}`;
  }
}