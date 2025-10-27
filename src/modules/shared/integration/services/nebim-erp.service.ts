import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NebimErpService {
  private readonly apiUrl = process.env.NEBIM_V3_API_URL;
  private readonly apiKey = process.env.NEBIM_V3_API_KEY;

  async syncProduct(productData: any, tenantId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/api/v3/products`,
        productData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(`Nebim product sync failed: ${error.message}`);
    }
  }

  async syncOrder(orderData: any, tenantId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/api/v3/orders`,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(`Nebim order sync failed: ${error.message}`);
    }
  }

  async getStockStatus(productCode: string, tenantId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/api/v3/stock/${productCode}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(`Nebim stock query failed: ${error.message}`);
    }
  }
}

