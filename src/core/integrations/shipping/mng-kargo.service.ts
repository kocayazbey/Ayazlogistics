import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface MNGShipmentRequest {
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
  packageInfo: {
    weight: number;
    desi: number;
    quantity: number;
    content: string;
  };
  paymentType: 'sender' | 'receiver';
}

@Injectable()
export class MNGKargoService {
  private readonly logger = new Logger(MNGKargoService.name);
  private readonly baseUrl = process.env.MNG_KARGO_API_URL || 'https://api.mngkargo.com.tr/api';
  private readonly apiKey = process.env.MNG_KARGO_API_KEY;
  private readonly customerId = process.env.MNG_KARGO_CUSTOMER_ID;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = !!(this.apiKey && this.customerId);
    
    if (this.enabled) {
      this.logger.log('MNG Kargo API configured successfully');
    } else {
      this.logger.warn('MNG Kargo credentials not found. Service disabled.');
    }
  }

  async createShipment(request: MNGShipmentRequest): Promise<any> {
    if (!this.enabled) {
      this.logger.warn('Shipment creation skipped - MNG Kargo not configured');
      return {
        success: false,
        trackingNumber: `MOCK-MNG-${Date.now()}`,
      };
    }

    const payload = {
      customerId: this.customerId,
      senderInfo: {
        name: request.sender.name,
        phone: request.sender.phone,
        address: request.sender.address,
        cityName: request.sender.city,
        townName: request.sender.district,
      },
      receiverInfo: {
        name: request.receiver.name,
        phone: request.receiver.phone,
        address: request.receiver.address,
        cityName: request.receiver.city,
        townName: request.receiver.district,
      },
      pieceInfo: {
        weight: request.packageInfo.weight,
        desi: request.packageInfo.desi,
        quantity: request.packageInfo.quantity,
        content: request.packageInfo.content,
      },
      paymentType: request.paymentType === 'sender' ? 1 : 2,
    };

    try {
      const response = await axios.post(`${this.baseUrl}/shipment/create`, payload, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`MNG Kargo shipment created: ${response.data.referenceNo}`);
      return response.data;
    } catch (error) {
      this.logger.error('MNG Kargo shipment creation failed', error);
      throw error;
    }
  }

  async trackShipment(referenceNo: string): Promise<any> {
    if (!this.enabled) {
      return {
        success: false,
        message: 'Service not configured',
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/shipment/track/${referenceNo}`, {
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Tracking query failed', error);
      throw error;
    }
  }

  async getBranchList(): Promise<any[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      const response = await axios.get(`${this.baseUrl}/branches`, {
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Branch list retrieval failed', error);
      throw error;
    }
  }
}

