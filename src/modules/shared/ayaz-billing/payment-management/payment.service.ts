import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../../database/schema/shared/billing.schema';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Payment[]> {
    const query = this.paymentRepository.createQueryBuilder('payment')
      .where('payment.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('payment.status = :status', { status: filters.status });
    }

    if (filters?.method) {
      query.andWhere('payment.method = :method', { method: filters.method });
    }

    if (filters?.dateRange) {
      query.andWhere('payment.paymentDate BETWEEN :startDate AND :endDate', {
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Payment> {
    return this.paymentRepository.findOne({
      where: { id, tenantId },
      relations: ['invoice', 'customer'],
    });
  }

  async create(paymentData: Partial<Payment>, tenantId: string): Promise<Payment> {
    const payment = this.paymentRepository.create({
      ...paymentData,
      tenantId,
      paymentNumber: this.generatePaymentNumber(),
      status: 'pending',
    });
    return this.paymentRepository.save(payment);
  }

  async update(id: string, paymentData: Partial<Payment>, tenantId: string): Promise<Payment> {
    await this.paymentRepository.update({ id, tenantId }, paymentData);
    return this.findOne(id, tenantId);
  }

  async processPayment(id: string, tenantId: string): Promise<Payment> {
    const payment = await this.findOne(id, tenantId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = 'processed';
    payment.processedAt = new Date();
    return this.paymentRepository.save(payment);
  }

  async refundPayment(id: string, refundAmount: number, tenantId: string): Promise<Payment> {
    const payment = await this.findOne(id, tenantId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = 'refunded';
    payment.refundedAt = new Date();
    payment.refundAmount = refundAmount;
    return this.paymentRepository.save(payment);
  }

  async getPaymentMetrics(tenantId: string): Promise<any> {
    const payments = await this.findAll(tenantId);
    
    const total = payments.length;
    const processed = payments.filter(p => p.status === 'processed').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const failed = payments.filter(p => p.status === 'failed').length;
    const refunded = payments.filter(p => p.status === 'refunded').length;

    return {
      total,
      processed,
      pending,
      failed,
      refunded,
      successRate: total > 0 ? (processed / total) * 100 : 0,
    };
  }

  async getPaymentMethods(tenantId: string): Promise<any> {
    const payments = await this.findAll(tenantId);
    
    const methods = {};
    for (const payment of payments) {
      if (payment.method) {
        methods[payment.method] = (methods[payment.method] || 0) + 1;
      }
    }

    return methods;
  }

  async getRevenueMetrics(tenantId: string): Promise<any> {
    const payments = await this.findAll(tenantId);
    
    const totalRevenue = payments
      .filter(p => p.status === 'processed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const pendingRevenue = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalRevenue,
      pendingRevenue,
      averagePaymentAmount: payments.length > 0 ? totalRevenue / payments.length : 0,
    };
  }

  async getPaymentTrends(tenantId: string, dateRange?: any): Promise<any> {
    const payments = await this.findAll(tenantId, dateRange);
    
    // Analyze payment trends
    // This would typically involve:
    // 1. Grouping payments by time period
    // 2. Calculating growth rates
    // 3. Identifying seasonal patterns
    // 4. Forecasting future revenue

    return {
      dailyTrends: [],
      weeklyTrends: [],
      monthlyTrends: [],
      growthRate: 0,
    };
  }

  async generatePaymentReport(tenantId: string, reportType: string, dateRange?: any): Promise<any> {
    const payments = await this.findAll(tenantId, dateRange);
    
    const report = {
      reportType,
      dateRange,
      generatedAt: new Date(),
      summary: {
        totalPayments: payments.length,
        totalAmount: 0,
        processedAmount: 0,
        pendingAmount: 0,
      },
      details: payments,
    };

    return report;
  }

  private generatePaymentNumber(): string {
    const timestamp = Date.now();
    return `PAY-${timestamp}`;
  }
}
