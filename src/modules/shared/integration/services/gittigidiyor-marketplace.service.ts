import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface GittiGidiyorOrder {
  orderId: string;
  orderDate: string;
  buyerName: string;
  shippingAddress: {
    fullName: string;
    address: string;
    city: string;
    district: string;
    postalCode: string;
  };
  items: Array<{
    productId: string;
    sku: string;
    title: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
}

@Injectable()
export class GittiGidiyorMarketplaceService {
  private readonly apiUrl = 'https://dev.gittigidiyor.com:8443/listingapi/ws';
  private readonly apiKey = process.env.GITTIGIDIYOR_API_KEY;
  private readonly apiSecret = process.env.GITTIGIDIYOR_API_SECRET;

  async getOrders(
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<GittiGidiyorOrder[]> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/SaleService`,
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          pageNumber: 1,
          pageSize: 100,
        },
        {
          headers: {
            'X-Auth-Token': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.salesList || [];
    } catch (error) {
      throw new Error(`GittiGidiyor orders fetch failed: ${error.message}`);
    }
  }

  async updateStock(
    productCode: string,
    quantity: number,
    tenantId: string,
  ): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/ProductService`,
        {
          productCode,
          catalogId: productCode,
          specs: {
            stock: quantity,
          },
        },
        {
          headers: {
            'X-Auth-Token': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      throw new Error(`GittiGidiyor stock update failed: ${error.message}`);
    }
  }

  async shipOrder(
    orderId: string,
    cargoCompany: string,
    trackingNumber: string,
    tenantId: string,
  ): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/SaleService/shipOrder`,
        {
          orderId,
          cargoCompany,
          trackingNumber,
        },
        {
          headers: {
            'X-Auth-Token': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      throw new Error(`GittiGidiyor order shipment failed: ${error.message}`);
    }
  }
}

