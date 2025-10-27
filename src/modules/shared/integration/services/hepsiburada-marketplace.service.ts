import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface HepsiburadaProduct {
  merchantSku: string;
  hbSku?: string;
  productName: string;
  categoryId: string;
  brandId: string;
  price: number;
  stock: number;
  barcode?: string;
  images?: string[];
  attributes?: Record<string, any>;
}

interface HepsiburadaOrder {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  status: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode?: string;
  };
  items: Array<{
    lineItemId: string;
    merchantSku: string;
    hbSku: string;
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  totalAmount: number;
  cargoTrackingNumber?: string;
  cargoTrackingLink?: string;
}

@Injectable()
export class HepsiburadaMarketplaceService {
  private readonly logger = new Logger(HepsiburadaMarketplaceService.name);
  private readonly client: AxiosInstance;
  private readonly merchantId: string;
  private readonly username: string;
  private readonly password: string;

  constructor(private readonly configService: ConfigService) {
    this.merchantId = this.configService.get<string>('HEPSIBURADA_MERCHANT_ID') || '';
    this.username = this.configService.get<string>('HEPSIBURADA_USERNAME') || '';
    this.password = this.configService.get<string>('HEPSIBURADA_PASSWORD') || '';

    this.client = axios.create({
      baseURL: 'https://mpop-sit.hepsiburada.com/product/api',
      auth: {
        username: this.username,
        password: this.password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async getOrders(status?: string, startDate?: Date, endDate?: Date): Promise<HepsiburadaOrder[]> {
    try {
      const params: any = {};
      if (status) params.status = status;
      if (startDate) params.beginDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const response = await this.client.get(`/orders/merchant/${this.merchantId}`, { params });

      return response.data?.items?.map((order: any) => this.mapOrder(order)) || [];
    } catch (error: any) {
      this.logger.error(`Hepsiburada get orders failed: ${error.message}`);
      return [];
    }
  }

  async getOrderDetail(orderId: string): Promise<HepsiburadaOrder | null> {
    try {
      const response = await this.client.get(`/orders/merchant/${this.merchantId}/order/${orderId}`);

      return this.mapOrder(response.data);
    } catch (error: any) {
      this.logger.error(`Hepsiburada get order detail failed: ${error.message}`);
      return null;
    }
  }

  async updateStock(merchantSku: string, quantity: number): Promise<boolean> {
    try {
      await this.client.post(`/products/merchant/${this.merchantId}/inventory`, {
        items: [
          {
            merchantSku,
            quantity,
          },
        ],
      });

      return true;
    } catch (error: any) {
      this.logger.error(`Hepsiburada stock update failed: ${error.message}`);
      return false;
    }
  }

  async updatePrice(merchantSku: string, price: number): Promise<boolean> {
    try {
      await this.client.post(`/products/merchant/${this.merchantId}/price`, {
        items: [
          {
            merchantSku,
            price,
          },
        ],
      });

      return true;
    } catch (error: any) {
      this.logger.error(`Hepsiburada price update failed: ${error.message}`);
      return false;
    }
  }

  async updateTrackingNumber(orderId: string, trackingNumber: string, carrier: string): Promise<boolean> {
    try {
      await this.client.post(`/orders/merchant/${this.merchantId}/cargo-info`, {
        orderId,
        cargoCompany: carrier,
        trackingNumber,
      });

      return true;
    } catch (error: any) {
      this.logger.error(`Hepsiburada tracking update failed: ${error.message}`);
      return false;
    }
  }

  async createProduct(product: HepsiburadaProduct): Promise<any> {
    try {
      const response = await this.client.post(`/products/merchant/${this.merchantId}`, {
        merchantSku: product.merchantSku,
        productName: product.productName,
        categoryId: product.categoryId,
        brandId: product.brandId,
        price: product.price,
        stock: product.stock,
        barcode: product.barcode,
        images: product.images || [],
        attributes: product.attributes || {},
      });

      return {
        success: true,
        hbSku: response.data?.hbSku,
        merchantSku: product.merchantSku,
      };
    } catch (error: any) {
      this.logger.error(`Hepsiburada product creation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateProduct(merchantSku: string, updates: Partial<HepsiburadaProduct>): Promise<boolean> {
    try {
      await this.client.put(`/products/merchant/${this.merchantId}/sku/${merchantSku}`, updates);

      return true;
    } catch (error: any) {
      this.logger.error(`Hepsiburada product update failed: ${error.message}`);
      return false;
    }
  }

  async deleteProduct(merchantSku: string): Promise<boolean> {
    try {
      await this.client.delete(`/products/merchant/${this.merchantId}/sku/${merchantSku}`);

      return true;
    } catch (error: any) {
      this.logger.error(`Hepsiburada product deletion failed: ${error.message}`);
      return false;
    }
  }

  private mapOrder(orderData: any): HepsiburadaOrder {
    return {
      orderId: orderData.id,
      orderNumber: orderData.orderNumber,
      orderDate: new Date(orderData.orderDate),
      status: orderData.status,
      customer: {
        name: orderData.shippingAddress?.name || '',
        email: orderData.email || '',
        phone: orderData.shippingAddress?.phone || '',
        address: orderData.shippingAddress?.address || '',
        city: orderData.shippingAddress?.city || '',
        district: orderData.shippingAddress?.district || '',
        postalCode: orderData.shippingAddress?.postalCode,
      },
      items: orderData.items?.map((item: any) => ({
        lineItemId: item.lineItemId,
        merchantSku: item.merchantSku,
        hbSku: item.hbSku,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.totalPrice,
      })) || [],
      totalAmount: orderData.totalAmount || 0,
      cargoTrackingNumber: orderData.cargoTrackingNumber,
      cargoTrackingLink: orderData.cargoTrackingLink,
    };
  }
}

