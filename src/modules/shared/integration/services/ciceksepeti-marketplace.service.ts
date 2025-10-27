import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface CiceksepetiOrder {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  deliveryType: 'standard' | 'express' | 'same_day';
  customerInfo: {
    name: string;
    phone: string;
  };
  deliveryAddress: {
    fullAddress: string;
    city: string;
    district: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
}

@Injectable()
export class CiceksepetiMarketplaceService {
  private readonly apiUrl = 'https://services.ciceksepeti.com/api';
  private readonly apiKey = process.env.CICEKSEPETI_API_KEY;
  private readonly sellerId = process.env.CICEKSEPETI_SELLER_ID;

  async getOrders(
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<CiceksepetiOrder[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/orders`,
        {
          params: {
            sellerId: this.sellerId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.orders || [];
    } catch (error) {
      throw new Error(`Çiçeksepeti orders fetch failed: ${error.message}`);
    }
  }

  async updateInventory(
    productId: string,
    stock: number,
    tenantId: string,
  ): Promise<void> {
    try {
      await axios.put(
        `${this.apiUrl}/products/${productId}/inventory`,
        {
          sellerId: this.sellerId,
          stock,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      throw new Error(`Çiçeksepeti inventory update failed: ${error.message}`);
    }
  }

  async confirmShipment(
    orderId: string,
    trackingNumber: string,
    carrierCode: string,
    tenantId: string,
  ): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/orders/${orderId}/ship`,
        {
          trackingNumber,
          carrierCode,
          shippedAt: new Date().toISOString(),
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      throw new Error(`Çiçeksepeti shipment confirmation failed: ${error.message}`);
    }
  }
}

