import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface MikroCustomer {
  customerCode: string;
  customerName: string;
  taxNumber: string;
  address: string;
  city: string;
  phone: string;
}

interface MikroInvoice {
  invoiceNumber: string;
  customerCode: string;
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;
  taxAmount: number;
  items: Array<{
    itemCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
}

@Injectable()
export class MikroErpService {
  private readonly apiUrl = process.env.MIKRO_ERP_API_URL;
  private readonly apiKey = process.env.MIKRO_ERP_API_KEY;

  async syncCustomer(customer: MikroCustomer, tenantId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/customers`,
        customer,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`Mikro ERP customer sync failed: ${error.message}`);
    }
  }

  async createInvoice(invoice: MikroInvoice, tenantId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/invoices`,
        invoice,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`Mikro ERP invoice creation failed: ${error.message}`);
    }
  }

  async getStockLevels(itemCode: string, tenantId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/stock/${itemCode}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`Mikro ERP stock query failed: ${error.message}`);
    }
  }
}

