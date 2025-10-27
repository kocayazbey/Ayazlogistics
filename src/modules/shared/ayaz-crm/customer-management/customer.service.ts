import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../../database/schema/shared/crm.schema';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Customer[]> {
    const query = this.customerRepository.createQueryBuilder('customer')
      .where('customer.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('customer.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      query.andWhere('customer.type = :type', { type: filters.type });
    }

    if (filters?.search) {
      query.andWhere('(customer.name ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Customer> {
    return this.customerRepository.findOne({
      where: { id, tenantId },
      relations: ['contacts', 'orders', 'activities'],
    });
  }

  async create(customerData: Partial<Customer>, tenantId: string): Promise<Customer> {
    const customer = this.customerRepository.create({
      ...customerData,
      tenantId,
      customerNumber: this.generateCustomerNumber(),
      status: 'active',
    });
    return this.customerRepository.save(customer);
  }

  async update(id: string, customerData: Partial<Customer>, tenantId: string): Promise<Customer> {
    await this.customerRepository.update({ id, tenantId }, customerData);
    return this.findOne(id, tenantId);
  }

  async updateStatus(id: string, status: string, tenantId: string): Promise<Customer> {
    const customer = await this.findOne(id, tenantId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    customer.status = status;
    customer.statusUpdatedAt = new Date();
    return this.customerRepository.save(customer);
  }

  async getCustomerMetrics(tenantId: string): Promise<any> {
    const customers = await this.findAll(tenantId);
    
    const total = customers.length;
    const active = customers.filter(c => c.status === 'active').length;
    const inactive = customers.filter(c => c.status === 'inactive').length;
    const newCustomers = customers.filter(c => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return c.createdAt >= thirtyDaysAgo;
    }).length;

    return {
      total,
      active,
      inactive,
      newCustomers,
      growthRate: total > 0 ? (newCustomers / total) * 100 : 0,
    };
  }

  async getCustomerValue(customerId: string, tenantId: string): Promise<any> {
    const customer = await this.findOne(customerId, tenantId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate customer value metrics
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      lastOrderDate: null,
      customerLifetimeValue: 0,
    };
  }

  async getCustomerSegments(tenantId: string): Promise<any> {
    const customers = await this.findAll(tenantId);
    
    // Segment customers based on various criteria
    const segments = {
      highValue: customers.filter(c => c.customerValue >= 10000),
      mediumValue: customers.filter(c => c.customerValue >= 5000 && c.customerValue < 10000),
      lowValue: customers.filter(c => c.customerValue < 5000),
      newCustomers: customers.filter(c => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return c.createdAt >= thirtyDaysAgo;
      }),
    };

    return segments;
  }

  private generateCustomerNumber(): string {
    const timestamp = Date.now();
    return `CUST-${timestamp}`;
  }
}
