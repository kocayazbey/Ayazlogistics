import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface ShipmentRequest {
  sender: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
  };
  receiver: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
  };
  packages: Array<{
    weight: number; // kg
    desi: number;
    quantity: number;
  }>;
  paymentType: 'sender' | 'receiver';
  serviceType: 'normal' | 'express';
}

@Injectable()
export class ArasKargoService {
  private readonly logger = new Logger(ArasKargoService.name);
  private readonly baseUrl = process.env.ARAS_KARGO_API_URL || 'https://api.araskargo.com.tr/v1';
  private readonly username = process.env.ARAS_KARGO_USERNAME;
  private readonly password = process.env.ARAS_KARGO_PASSWORD;
  private readonly customerId = process.env.ARAS_KARGO_CUSTOMER_ID;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = !!(this.username && this.password && this.customerId);
    
    if (this.enabled) {
      this.logger.log('Aras Kargo API configured successfully');
    } else {
      this.logger.warn('Aras Kargo credentials not found. Service disabled.');
    }
  }

  async createShipment(request: ShipmentRequest): Promise<any> {
    if (!this.enabled) {
      this.logger.warn('Shipment creation skipped - Aras Kargo not configured');
      return {
        success: false,
        trackingNumber: `MOCK-ARAS-${Date.now()}`,
      };
    }

    const payload = {
      CustomerCode: this.customerId,
      Username: this.username,
      Password: this.password,
      SenderName: request.sender.name,
      SenderPhone: request.sender.phone,
      SenderAddress: request.sender.address,
      SenderCity: request.sender.city,
      SenderDistrict: request.sender.district,
      ReceiverName: request.receiver.name,
      ReceiverPhone: request.receiver.phone,
      ReceiverAddress: request.receiver.address,
      ReceiverCity: request.receiver.city,
      ReceiverDistrict: request.receiver.district,
      PaymentType: request.paymentType === 'sender' ? 1 : 2,
      ServiceType: request.serviceType === 'express' ? 2 : 1,
      Packages: request.packages.map(pkg => ({
        Weight: pkg.weight,
        Desi: pkg.desi,
        Quantity: pkg.quantity,
      })),
    };

    try {
      const response = await axios.post(`${this.baseUrl}/shipment/create`, payload);
      this.logger.log(`Aras Kargo shipment created: ${response.data.TrackingNumber}`);
      return response.data;
    } catch (error) {
      this.logger.error('Aras Kargo shipment creation failed', error);
      throw error;
    }
  }

  async trackShipment(trackingNumber: string): Promise<any> {
    if (!this.enabled) {
      return {
        success: false,
        message: 'Service not configured',
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/tracking/${trackingNumber}`, {
        params: {
          Username: this.username,
          Password: this.password,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Tracking query failed', error);
      throw error;
    }
  }

  async cancelShipment(trackingNumber: string): Promise<any> {
    if (!this.enabled) {
      return {
        success: false,
        message: 'Service not configured',
      };
    }

    try {
      const response = await axios.post(`${this.baseUrl}/shipment/cancel`, {
        Username: this.username,
        Password: this.password,
        TrackingNumber: trackingNumber,
      });

      this.logger.log(`Shipment cancelled: ${trackingNumber}`);
      return response.data;
    } catch (error) {
      this.logger.error('Shipment cancellation failed', error);
      throw error;
    }
  }
}
