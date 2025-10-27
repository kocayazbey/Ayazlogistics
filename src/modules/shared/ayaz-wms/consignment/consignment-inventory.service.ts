import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface ConsignmentStock {
  id: string;
  supplierId: string;
  customerId: string;
  productId: string;
  quantity: number;
  consignmentTerms: {
    paymentTrigger: 'sale' | 'usage' | 'time_based';
    settlementPeriod: number;
    returnPolicy: string;
  };
  receivedDate: Date;
  expiryDate?: Date;
}

@Injectable()
export class ConsignmentInventoryService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async receiveConsignmentStock(
    stock: Omit<ConsignmentStock, 'id' | 'receivedDate'>,
    tenantId: string,
  ): Promise<ConsignmentStock> {
    const stockId = `CS-${Date.now()}`;

    return {
      id: stockId,
      ...stock,
      receivedDate: new Date(),
    };
  }

  async recordConsignmentSale(
    consignmentId: string,
    quantitySold: number,
    saleValue: number,
    tenantId: string,
  ): Promise<void> {
    // Record sale and trigger settlement
  }

  async getConsignmentBalance(
    supplierId: string,
    customerId: string,
    tenantId: string,
  ): Promise<{
    totalQuantity: number;
    soldQuantity: number;
    remainingQuantity: number;
    totalValue: number;
    amountDue: number;
  }> {
    return {
      totalQuantity: 1000,
      soldQuantity: 350,
      remainingQuantity: 650,
      totalValue: 50000,
      amountDue: 17500,
    };
  }
}

