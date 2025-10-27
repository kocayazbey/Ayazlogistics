import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface AmazonOrder {
  amazonOrderId: string;
  purchaseDate: string;
  orderStatus: string;
  fulfillmentChannel: 'MFN' | 'AFN';
  salesChannel: string;
  orderTotal: {
    currencyCode: string;
    amount: number;
  };
  shippingAddress: {
    name: string;
    addressLine1: string;
    city: string;
    stateOrRegion: string;
    postalCode: string;
    countryCode: string;
  };
  orderItems: Array<{
    asin: string;
    sku: string;
    title: string;
    quantityOrdered: number;
    itemPrice: number;
  }>;
}

@Injectable()
export class AmazonMarketplaceService {
  private readonly apiUrl = 'https://sellingpartnerapi-eu.amazon.com';
  private readonly accessToken = process.env.AMAZON_SP_ACCESS_TOKEN;
  private readonly sellerId = process.env.AMAZON_SELLER_ID;

  async getOrders(
    createdAfter: Date,
    createdBefore: Date,
    tenantId: string,
  ): Promise<AmazonOrder[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/orders/v0/orders`,
        {
          params: {
            MarketplaceIds: 'A1PA6795UKMFR9', // Turkey marketplace
            CreatedAfter: createdAfter.toISOString(),
            CreatedBefore: createdBefore.toISOString(),
          },
          headers: {
            'x-amz-access-token': this.accessToken,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.payload.Orders || [];
    } catch (error) {
      throw new Error(`Amazon orders fetch failed: ${error.message}`);
    }
  }

  async getOrderItems(orderId: string, tenantId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/orders/v0/orders/${orderId}/orderItems`,
        {
          headers: {
            'x-amz-access-token': this.accessToken,
          },
        },
      );

      return response.data.payload.OrderItems || [];
    } catch (error) {
      throw new Error(`Amazon order items fetch failed: ${error.message}`);
    }
  }

  async updateInventory(
    sku: string,
    quantity: number,
    tenantId: string,
  ): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/fba/inventory/v1/items/inventory`,
        {
          sellerSku: sku,
          marketplaceId: 'A1PA6795UKMFR9',
          quantity: {
            amount: quantity,
          },
        },
        {
          headers: {
            'x-amz-access-token': this.accessToken,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      throw new Error(`Amazon inventory update failed: ${error.message}`);
    }
  }

  async submitShipment(
    orderId: string,
    trackingNumber: string,
    carrier: string,
    tenantId: string,
  ): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/orders/v0/orders/${orderId}/shipment`,
        {
          trackingNumber,
          carrierCode: carrier,
        },
        {
          headers: {
            'x-amz-access-token': this.accessToken,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      throw new Error(`Amazon shipment submission failed: ${error.message}`);
    }
  }
}

