import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface YurticiShipmentRequest {
  sender: {
    name: string;
    phone: string;
    address: string;
    cityCode: string;
    districtCode: string;
  };
  receiver: {
    name: string;
    phone: string;
    address: string;
    cityCode: string;
    districtCode: string;
  };
  packageInfo: {
    weight: number;
    desi: number;
    quantity: number;
    value: number;
  };
  serviceType: 'standart' | 'ekonomik' | 'express';
  paymentType: 'sender' | 'receiver';
}

@Injectable()
export class YurticiKargoService {
  private readonly logger = new Logger(YurticiKargoService.name);
  private readonly baseUrl = process.env.YURTICI_KARGO_API_URL || 'https://api.yurticikargo.com';
  private readonly username = process.env.YURTICI_KARGO_USERNAME;
  private readonly password = process.env.YURTICI_KARGO_PASSWORD;
  private readonly customerId = process.env.YURTICI_KARGO_CUSTOMER_ID;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = !!(this.username && this.password && this.customerId);
    
    if (this.enabled) {
      this.logger.log('Yurtiçi Kargo API configured successfully');
    } else {
      this.logger.warn('Yurtiçi Kargo credentials not found. Service disabled.');
    }
  }

  async createShipment(request: YurticiShipmentRequest): Promise<any> {
    if (!this.enabled) {
      this.logger.warn('Shipment creation skipped - Yurtiçi Kargo not configured');
      return {
        success: false,
        trackingNumber: `MOCK-YURTICI-${Date.now()}`,
      };
    }

    const payload = {
      userName: this.username,
      password: this.password,
      customerId: this.customerId,
      senderName: request.sender.name,
      senderPhone: request.sender.phone,
      senderAddress: request.sender.address,
      senderCityCode: request.sender.cityCode,
      senderDistrictCode: request.sender.districtCode,
      receiverName: request.receiver.name,
      receiverPhone: request.receiver.phone,
      receiverAddress: request.receiver.address,
      receiverCityCode: request.receiver.cityCode,
      receiverDistrictCode: request.receiver.districtCode,
      pieceCount: request.packageInfo.quantity,
      weight: request.packageInfo.weight,
      desi: request.packageInfo.desi,
      cargoValue: request.packageInfo.value,
      serviceType: request.serviceType,
      paymentType: request.paymentType === 'sender' ? 1 : 2,
    };

    try {
      const response = await axios.post(`${this.baseUrl}/ShippingOrderService/AddShippingOrder`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Yurtiçi Kargo shipment created: ${response.data.OrderBarcode}`);
      return response.data;
    } catch (error) {
      this.logger.error('Yurtiçi Kargo shipment creation failed', error);
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

    const payload = {
      userName: this.username,
      password: this.password,
      invoiceOrBarcode: trackingNumber,
    };

    try {
      const response = await axios.post(`${this.baseUrl}/TrackingService/GetTracking`, payload);
      return response.data;
    } catch (error) {
      this.logger.error('Tracking query failed', error);
      throw error;
    }
  }

  async getCityList(): Promise<any[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      const response = await axios.post(`${this.baseUrl}/MasterDataService/GetCityList`, {
        userName: this.username,
        password: this.password,
      });

      return response.data;
    } catch (error) {
      this.logger.error('City list retrieval failed', error);
      throw error;
    }
  }

  async getDistrictList(cityCode: string): Promise<any[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      const response = await axios.post(`${this.baseUrl}/MasterDataService/GetDistrictList`, {
        userName: this.username,
        password: this.password,
        cityCode,
      });

      return response.data;
    } catch (error) {
      this.logger.error('District list retrieval failed', error);
      throw error;
    }
  }
}

