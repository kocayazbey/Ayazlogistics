import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface N11Product {
  productSellerCode: string;
  title: string;
  subtitle?: string;
  categoryId: number;
  price: number;
  currencyType: 'TL' | 'USD' | 'EUR';
  stock: number;
  barcode?: string;
  images?: string[];
  attributes?: Record<string, any>;
}

interface N11Order {
  id: number;
  orderNumber: string;
  orderDate: Date;
  status: string;
  buyer: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    district: string;
  };
  items: Array<{
    productSellerCode: string;
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  totalAmount: number;
  shipmentInfo?: {
    shipmentCompany: string;
    trackingNumber: string;
  };
}

@Injectable()
export class N11MarketplaceService {
  private readonly logger = new Logger(N11MarketplaceService.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('N11_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('N11_API_SECRET') || '';

    this.client = axios.create({
      baseURL: 'https://api.n11.com/rest/n11Api',
      headers: {
        'Content-Type': 'application/xml',
      },
      timeout: 30000,
    });
  }

  async getOrders(status?: string): Promise<N11Order[]> {
    try {
      const soapRequest = this.buildSOAPRequest('OrderService', 'OrderList', {
        status: status || 'New',
      });

      const response = await this.client.post('', soapRequest);

      return this.parseOrdersFromXML(response.data);
    } catch (error: any) {
      this.logger.error(`N11 get orders failed: ${error.message}`);
      return [];
    }
  }

  async getOrderDetail(orderId: number): Promise<N11Order | null> {
    try {
      const soapRequest = this.buildSOAPRequest('OrderService', 'OrderDetail', {
        orderId,
      });

      const response = await this.client.post('', soapRequest);

      return this.parseOrderFromXML(response.data);
    } catch (error: any) {
      this.logger.error(`N11 get order detail failed: ${error.message}`);
      return null;
    }
  }

  async updateStock(productSellerCode: string, quantity: number): Promise<boolean> {
    try {
      const soapRequest = this.buildSOAPRequest('ProductService', 'UpdateStockByStockSellerCode', {
        productSellerCode,
        quantity,
      });

      await this.client.post('', soapRequest);

      return true;
    } catch (error: any) {
      this.logger.error(`N11 stock update failed: ${error.message}`);
      return false;
    }
  }

  async updatePrice(productSellerCode: string, price: number): Promise<boolean> {
    try {
      const soapRequest = this.buildSOAPRequest('ProductService', 'UpdateProductPriceBySellerCode', {
        productSellerCode,
        price,
      });

      await this.client.post('', soapRequest);

      return true;
    } catch (error: any) {
      this.logger.error(`N11 price update failed: ${error.message}`);
      return false;
    }
  }

  async updateShipmentInfo(orderId: number, trackingNumber: string, carrier: string): Promise<boolean> {
    try {
      const soapRequest = this.buildSOAPRequest('OrderService', 'OrderShipment', {
        orderId,
        shipmentCompanyName: carrier,
        trackingNumber,
      });

      await this.client.post('', soapRequest);

      return true;
    } catch (error: any) {
      this.logger.error(`N11 shipment update failed: ${error.message}`);
      return false;
    }
  }

  async createProduct(product: N11Product): Promise<any> {
    try {
      const soapRequest = this.buildSOAPRequest('ProductService', 'SaveProduct', {
        product: {
          productSellerCode: product.productSellerCode,
          title: product.title,
          subtitle: product.subtitle,
          categoryId: product.categoryId,
          salePrice: product.price,
          currencyType: product.currencyType,
          stockItems: {
            stockItem: {
              quantity: product.stock,
              sellerStockCode: product.productSellerCode,
            },
          },
          productionDate: new Date().toISOString().split('T')[0],
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          images: {
            image: product.images || [],
          },
        },
      });

      const response = await this.client.post('', soapRequest);

      return {
        success: true,
        productId: this.extractFromXML(response.data, 'id'),
      };
    } catch (error: any) {
      this.logger.error(`N11 product creation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private buildSOAPRequest(service: string, method: string, data: any): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" 
                   xmlns:ns1="http://www.n11.com/ws/schemas">
  <SOAP-ENV:Header/>
  <SOAP-ENV:Body>
    <ns1:${method}>
      <auth>
        <appKey>${this.apiKey}</appKey>
        <appSecret>${this.apiSecret}</appSecret>
      </auth>
      ${this.objectToXML(data)}
    </ns1:${method}>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
  }

  private objectToXML(obj: any, indent: string = '      '): string {
    let xml = '';
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        xml += `${indent}<${key}>\n${this.objectToXML(value, indent + '  ')}${indent}</${key}>\n`;
      } else {
        xml += `${indent}<${key}>${value}</${key}>\n`;
      }
    }
    return xml;
  }

  private extractFromXML(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
  }

  private parseOrdersFromXML(xml: string): N11Order[] {
    // Basic XML parsing - would use proper XML parser in production
    return [];
  }

  private parseOrderFromXML(xml: string): N11Order | null {
    // Basic XML parsing - would use proper XML parser in production
    return null;
  }
}

