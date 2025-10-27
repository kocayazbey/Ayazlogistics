import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NetsisErpService {
  private readonly apiUrl = process.env.NETSIS_ERP_API_URL;
  private readonly username = process.env.NETSIS_USERNAME;
  private readonly password = process.env.NETSIS_PASSWORD;

  async syncCustomer(customerData: any, tenantId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/cari-hesap`,
        customerData,
        {
          auth: {
            username: this.username,
            password: this.password,
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(`Netsis customer sync failed: ${error.message}`);
    }
  }

  async createInvoice(invoiceData: any, tenantId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/fatura`,
        invoiceData,
        {
          auth: {
            username: this.username,
            password: this.password,
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(`Netsis invoice creation failed: ${error.message}`);
    }
  }

  async updateStock(stockData: any, tenantId: string): Promise<any> {
    try {
      const response = await axios.put(
        `${this.apiUrl}/stok`,
        stockData,
        {
          auth: {
            username: this.username,
            password: this.password,
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(`Netsis stock update failed: ${error.message}`);
    }
  }
}

