import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class LabelPrintingService {
  constructor(
    @InjectRepository(Label)
    private labelRepository: Repository<Label>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Label[]> {
    const query = this.labelRepository.createQueryBuilder('label')
      .where('label.tenantId = :tenantId', { tenantId });

    if (filters?.type) {
      query.andWhere('label.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      query.andWhere('label.status = :status', { status: filters.status });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Label> {
    return this.labelRepository.findOne({
      where: { id, tenantId },
      relations: ['item', 'order'],
    });
  }

  async create(labelData: Partial<Label>, tenantId: string): Promise<Label> {
    const label = this.labelRepository.create({
      ...labelData,
      tenantId,
      labelNumber: this.generateLabelNumber(),
      status: 'pending',
    });
    return this.labelRepository.save(label);
  }

  async update(id: string, labelData: Partial<Label>, tenantId: string): Promise<Label> {
    await this.labelRepository.update({ id, tenantId }, labelData);
    return this.findOne(id, tenantId);
  }

  async printLabel(id: string, tenantId: string): Promise<Label> {
    const label = await this.findOne(id, tenantId);
    if (!label) {
      throw new Error('Label not found');
    }

    // Implement label printing logic
    // This would typically involve:
    // 1. Generating label content
    // 2. Sending to printer
    // 3. Updating print status
    // 4. Logging print history

    label.status = 'printed';
    label.printedAt = new Date();
    return this.labelRepository.save(label);
  }

  async printBatchLabels(labelIds: string[], tenantId: string): Promise<Label[]> {
    const labels = await this.labelRepository.findByIds(labelIds, {
      where: { tenantId },
    });

    const printedLabels = [];
    for (const label of labels) {
      label.status = 'printed';
      label.printedAt = new Date();
      printedLabels.push(await this.labelRepository.save(label));
    }

    return printedLabels;
  }

  async getLabelTemplate(type: string, tenantId: string): Promise<any> {
    // Return label template based on type
    const templates = {
      item: {
        fields: ['itemCode', 'itemName', 'barcode', 'location'],
        layout: 'standard',
        size: '4x2',
      },
      shipping: {
        fields: ['trackingNumber', 'destination', 'weight', 'dimensions'],
        layout: 'shipping',
        size: '4x6',
      },
      location: {
        fields: ['locationCode', 'zone', 'aisle', 'rack'],
        layout: 'location',
        size: '2x1',
      },
    };

    return templates[type] || templates.item;
  }

  async getPrintStats(tenantId: string): Promise<any> {
    const labels = await this.findAll(tenantId);
    
    const total = labels.length;
    const printed = labels.filter(l => l.status === 'printed').length;
    const pending = labels.filter(l => l.status === 'pending').length;
    const failed = labels.filter(l => l.status === 'failed').length;

    return {
      total,
      printed,
      pending,
      failed,
      successRate: total > 0 ? (printed / total) * 100 : 0,
    };
  }

  private generateLabelNumber(): string {
    const timestamp = Date.now();
    return `LAB-${timestamp}`;
  }
}