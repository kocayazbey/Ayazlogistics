import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TrendyolService {
  private readonly logger = new Logger(TrendyolService.name);
  private readonly apiUrl = process.env.TRENDYOL_API_URL || 'https://api.trendyol.com';

  async syncOrders(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/sapigw/suppliers/${process.env.TRENDYOL_SUPPLIER_ID}/orders`, {
        headers: this.getHeaders(),
      });
      this.logger.log(`Synced ${response.data.content.length} orders from Trendyol`);
      return response.data.content;
    } catch (error) {
      this.logger.error('Trendyol order sync failed:', error);
      throw error;
    }
  }

  async updateInventory(sku: string, quantity: number): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/sapigw/suppliers/${process.env.TRENDYOL_SUPPLIER_ID}/products/price-and-inventory`, {
        items: [{ barcode: sku, quantity, salePrice: 100 }],
      }, {
        headers: this.getHeaders(),
      });
      this.logger.log(`Updated inventory for SKU ${sku}: ${quantity}`);
    } catch (error) {
      this.logger.error(`Inventory update failed for ${sku}:`, error);
      throw error;
    }
  }

  async updateShipmentTracking(orderId: string, trackingNumber: string, carrier: string): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/sapigw/suppliers/${process.env.TRENDYOL_SUPPLIER_ID}/shipments`, {
        orderNumber: orderId,
        trackingNumber,
        carrierCode: carrier,
      }, {
        headers: this.getHeaders(),
      });
      this.logger.log(`Updated shipment tracking for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Shipment tracking update failed for ${orderId}:`, error);
      throw error;
    }
  }

  private getHeaders(): Record<string, string> {
    const auth = Buffer.from(`${process.env.TRENDYOL_API_KEY}:${process.env.TRENDYOL_API_SECRET}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'User-Agent': 'AyazLogistics/1.0',
    };
  }
}

