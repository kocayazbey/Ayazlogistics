import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../../../database/schema/shared/billing.schema';

@Injectable()
export class ContractService {
  constructor(
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Contract[]> {
    const query = this.contractRepository.createQueryBuilder('contract')
      .where('contract.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('contract.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      query.andWhere('contract.type = :type', { type: filters.type });
    }

    if (filters?.customer) {
      query.andWhere('contract.customer = :customer', { customer: filters.customer });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Contract> {
    return this.contractRepository.findOne({
      where: { id, tenantId },
      relations: ['customer', 'terms'],
    });
  }

  async create(contractData: Partial<Contract>, tenantId: string): Promise<Contract> {
    const contract = this.contractRepository.create({
      ...contractData,
      tenantId,
      contractNumber: this.generateContractNumber(),
      status: 'draft',
    });
    return this.contractRepository.save(contract);
  }

  async update(id: string, contractData: Partial<Contract>, tenantId: string): Promise<Contract> {
    await this.contractRepository.update({ id, tenantId }, contractData);
    return this.findOne(id, tenantId);
  }

  async activateContract(id: string, tenantId: string): Promise<Contract> {
    const contract = await this.findOne(id, tenantId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    contract.status = 'active';
    contract.activatedAt = new Date();
    return this.contractRepository.save(contract);
  }

  async renewContract(id: string, newEndDate: Date, tenantId: string): Promise<Contract> {
    const contract = await this.findOne(id, tenantId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    contract.endDate = newEndDate;
    contract.renewedAt = new Date();
    contract.renewalCount = (contract.renewalCount || 0) + 1;
    return this.contractRepository.save(contract);
  }

  async getContractMetrics(tenantId: string): Promise<any> {
    const contracts = await this.findAll(tenantId);
    
    const total = contracts.length;
    const active = contracts.filter(c => c.status === 'active').length;
    const expired = contracts.filter(c => c.status === 'expired').length;
    const pending = contracts.filter(c => c.status === 'pending').length;

    return {
      total,
      active,
      expired,
      pending,
      renewalRate: total > 0 ? (active / total) * 100 : 0,
    };
  }

  async getExpiringContracts(tenantId: string, days: number = 30): Promise<Contract[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return this.contractRepository.find({
      where: {
        tenantId,
        status: 'active',
        endDate: { $lte: expiryDate },
      },
      order: { endDate: 'ASC' },
    });
  }

  async getContractValue(contractId: string, tenantId: string): Promise<any> {
    const contract = await this.findOne(contractId, tenantId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    return {
      totalValue: contract.totalValue || 0,
      paidAmount: contract.paidAmount || 0,
      remainingAmount: (contract.totalValue || 0) - (contract.paidAmount || 0),
      paymentStatus: contract.paymentStatus || 'pending',
    };
  }

  async generateContractReport(tenantId: string, reportType: string): Promise<any> {
    const contracts = await this.findAll(tenantId);
    
    const report = {
      reportType,
      generatedAt: new Date(),
      summary: {
        totalContracts: contracts.length,
        totalValue: 0,
        activeContracts: 0,
        expiringSoon: 0,
      },
      details: contracts,
    };

    return report;
  }

  private generateContractNumber(): string {
    const timestamp = Date.now();
    return `CNT-${timestamp}`;
  }
}
