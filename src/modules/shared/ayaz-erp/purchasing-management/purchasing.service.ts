import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder } from '../../../database/schema/shared/erp.schema';

@Injectable()
export class PurchasingService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<PurchaseOrder[]> {
    const query = this.purchaseOrderRepository.createQueryBuilder('purchaseOrder')
      .where('purchaseOrder.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('purchaseOrder.status = :status', { status: filters.status });
    }

    if (filters?.supplier) {
      query.andWhere('purchaseOrder.supplier = :supplier', { supplier: filters.supplier });
    }

    if (filters?.dateRange) {
      query.andWhere('purchaseOrder.orderDate BETWEEN :startDate AND :endDate', {
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<PurchaseOrder> {
    return this.purchaseOrderRepository.findOne({
      where: { id, tenantId },
      relations: ['supplier', 'items'],
    });
  }

  async create(purchaseOrderData: Partial<PurchaseOrder>, tenantId: string): Promise<PurchaseOrder> {
    const purchaseOrder = this.purchaseOrderRepository.create({
      ...purchaseOrderData,
      tenantId,
      orderNumber: this.generateOrderNumber(),
      status: 'pending',
    });
    return this.purchaseOrderRepository.save(purchaseOrder);
  }

  async update(id: string, purchaseOrderData: Partial<PurchaseOrder>, tenantId: string): Promise<PurchaseOrder> {
    await this.purchaseOrderRepository.update({ id, tenantId }, purchaseOrderData);
    return this.findOne(id, tenantId);
  }

  async approveOrder(id: string, tenantId: string): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOne(id, tenantId);
    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    purchaseOrder.status = 'approved';
    purchaseOrder.approvedAt = new Date();
    return this.purchaseOrderRepository.save(purchaseOrder);
  }

  async receiveOrder(id: string, tenantId: string): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOne(id, tenantId);
    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    purchaseOrder.status = 'received';
    purchaseOrder.receivedAt = new Date();
    return this.purchaseOrderRepository.save(purchaseOrder);
  }

  async getPurchasingMetrics(tenantId: string): Promise<any> {
    const purchaseOrders = await this.findAll(tenantId);
    
    const total = purchaseOrders.length;
    const pending = purchaseOrders.filter(po => po.status === 'pending').length;
    const approved = purchaseOrders.filter(po => po.status === 'approved').length;
    const received = purchaseOrders.filter(po => po.status === 'received').length;
    const cancelled = purchaseOrders.filter(po => po.status === 'cancelled').length;

    return {
      total,
      pending,
      approved,
      received,
      cancelled,
      approvalRate: total > 0 ? (approved / total) * 100 : 0,
    };
  }

  async getSupplierMetrics(tenantId: string): Promise<any> {
    const purchaseOrders = await this.findAll(tenantId);
    
    const suppliers = {};
    for (const po of purchaseOrders) {
      if (po.supplier) {
        suppliers[po.supplier] = (suppliers[po.supplier] || 0) + 1;
      }
    }

    return suppliers;
  }

  async getCostAnalysis(tenantId: string): Promise<any> {
    const purchaseOrders = await this.findAll(tenantId);
    
    const totalCost = purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    const averageOrderValue = purchaseOrders.length > 0 ? totalCost / purchaseOrders.length : 0;

    return {
      totalCost,
      averageOrderValue,
      costTrend: 0,
      savings: 0,
    };
  }

  async generatePurchaseReport(tenantId: string, reportType: string, dateRange?: any): Promise<any> {
    const purchaseOrders = await this.findAll(tenantId, dateRange);
    
    const report = {
      reportType,
      dateRange,
      generatedAt: new Date(),
      summary: {
        totalOrders: purchaseOrders.length,
        totalValue: 0,
        averageOrderValue: 0,
      },
      details: purchaseOrders,
    };

    return report;
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now();
    return `PO-${timestamp}`;
  }
}
