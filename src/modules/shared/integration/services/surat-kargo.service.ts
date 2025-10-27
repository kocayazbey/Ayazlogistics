import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface SuratShipmentRequest {
  senderName: string;
  senderAddress: string;
  senderCity: string;
  senderPhone: string;
  receiverName: string;
  receiverAddress: string;
  receiverCity: string;
  receiverPhone: string;
  weight: number;
  desi: number;
  paymentType: 'sender' | 'receiver';
  description: string;
}

@Injectable()
export class SuratKargoService {
  private readonly apiUrl = 'https://api.suratkargo.com.tr/v1';
  private readonly apiKey = process.env.SURAT_KARGO_API_KEY;

  async createShipment(data: SuratShipmentRequest, tenantId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/shipments`,
        {
          ...data,
          service_type: 'standard',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        trackingNumber: response.data.tracking_number,
        barcode: response.data.barcode,
        estimatedDelivery: response.data.estimated_delivery,
      };
    } catch (error) {
      throw new Error(`Sürat Kargo shipment creation failed: ${error.message}`);
    }
  }

  async trackShipment(trackingNumber: string, tenantId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/tracking/${trackingNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`Sürat Kargo tracking failed: ${error.message}`);
    }
  }

  async cancelShipment(trackingNumber: string, tenantId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.apiUrl}/shipments/${trackingNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
      );
    } catch (error) {
      throw new Error(`Sürat Kargo cancellation failed: ${error.message}`);
    }
  }

  async getLabel(trackingNumber: string, tenantId: string): Promise<Buffer> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/shipments/${trackingNumber}/label`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
          responseType: 'arraybuffer',
        },
      );

      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Sürat Kargo label retrieval failed: ${error.message}`);
    }
  }
}

