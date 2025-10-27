import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface PTTShipmentRequest {
  shipper: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    tcNo?: string;
  };
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    tcNo?: string;
  };
  packages: Array<{
    weight: number;
    desi: number;
    quantity: number;
    description: string;
    value?: number;
  }>;
  paymentType: 'sender' | 'recipient';
  serviceType: 'standard' | 'express' | 'economic';
  invoiceNo?: string;
}

@Injectable()
export class PTTKargoService {
  private readonly logger = new Logger(PTTKargoService.name);
  private readonly client: AxiosInstance;
  private readonly username: string;
  private readonly password: string;
  private readonly customerCode: string;
  private readonly contractNo: string;

  constructor(private readonly configService: ConfigService) {
    this.username = this.configService.get<string>('PTT_USERNAME') || '';
    this.password = this.configService.get<string>('PTT_PASSWORD') || '';
    this.customerCode = this.configService.get<string>('PTT_CUSTOMER_CODE') || '';
    this.contractNo = this.configService.get<string>('PTT_CONTRACT_NO') || '';

    this.client = axios.create({
      baseURL: 'https://kargotakip.ptt.gov.tr/api',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async createShipment(request: PTTShipmentRequest, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating PTT Kargo shipment for tenant ${tenantId}`);

      const totalWeight = request.packages.reduce((sum, pkg) => sum + pkg.weight, 0);
      const totalDesi = request.packages.reduce((sum, pkg) => sum + pkg.desi, 0);
      const totalValue = request.packages.reduce((sum, pkg) => sum + (pkg.value || 0), 0);

      const payload = {
        username: this.username,
        password: this.password,
        customerCode: this.customerCode,
        contractNo: this.contractNo,
        shipment: {
          senderName: request.shipper.name,
          senderPhone: request.shipper.phone,
          senderAddress: request.shipper.address,
          senderCity: request.shipper.city,
          senderDistrict: request.shipper.district,
          senderTcNo: request.shipper.tcNo || '',
          receiverName: request.recipient.name,
          receiverPhone: request.recipient.phone,
          receiverAddress: request.recipient.address,
          receiverCity: request.recipient.city,
          receiverDistrict: request.recipient.district,
          receiverTcNo: request.recipient.tcNo || '',
          pieceCount: request.packages.reduce((sum, pkg) => sum + pkg.quantity, 0),
          weight: totalWeight,
          desi: totalDesi,
          cargoValue: totalValue,
          paymentType: request.paymentType === 'sender' ? 1 : 2,
          serviceType: this.mapServiceType(request.serviceType),
          description: request.packages[0]?.description || 'Genel Kargo',
          invoiceNo: request.invoiceNo || '',
        },
      };

      const response = await this.client.post('/shipment/create', payload);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Shipment creation failed');
      }

      return {
        success: true,
        carrier: 'PTTKargo',
        trackingNumber: response.data.trackingNumber,
        barcodeNumber: response.data.barcodeNumber,
        shipmentId: response.data.shipmentId,
        labelUrl: response.data.labelUrl,
      };
    } catch (error: any) {
      this.logger.error(`PTT Kargo shipment creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async trackShipment(trackingNumber: string): Promise<any> {
    try {
      this.logger.debug(`Tracking PTT Kargo shipment: ${trackingNumber}`);

      const response = await this.client.get(`/tracking/${trackingNumber}`, {
        params: {
          username: this.username,
          password: this.password,
        },
      });

      if (!response.data?.success) {
        return null;
      }

      return {
        trackingNumber,
        carrier: 'PTTKargo',
        status: response.data.currentStatus || 'Unknown',
        statusCode: response.data.statusCode,
        events: response.data.trackingHistory?.map((event: any) => ({
          timestamp: event.date,
          location: event.location,
          description: event.description,
          statusCode: event.code,
        })) || [],
        estimatedDelivery: response.data.estimatedDelivery,
        actualDelivery: response.data.deliveryDate,
      };
    } catch (error: any) {
      this.logger.error(`PTT Kargo tracking failed: ${error.message}`, error.stack);
      return null;
    }
  }

  async getLabel(trackingNumber: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/label/${trackingNumber}`, {
        params: {
          username: this.username,
          password: this.password,
        },
        responseType: 'arraybuffer',
      });

      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      return base64;
    } catch (error: any) {
      this.logger.error(`PTT Kargo label retrieval failed: ${error.message}`);
      return null;
    }
  }

  async cancelShipment(trackingNumber: string, tenantId: string): Promise<boolean> {
    try {
      this.logger.log(`Cancelling PTT Kargo shipment: ${trackingNumber}`);

      const response = await this.client.post('/shipment/cancel', {
        username: this.username,
        password: this.password,
        trackingNumber,
      });

      return response.data?.success === true;
    } catch (error: any) {
      this.logger.error(`PTT Kargo cancellation failed: ${error.message}`);
      return false;
    }
  }

  async getCityList(): Promise<any[]> {
    try {
      const response = await this.client.get('/location/cities', {
        params: {
          username: this.username,
          password: this.password,
        },
      });

      return response.data?.cities || [];
    } catch (error: any) {
      this.logger.error(`Failed to get city list: ${error.message}`);
      return [];
    }
  }

  async getDistrictList(cityCode: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/location/districts/${cityCode}`, {
        params: {
          username: this.username,
          password: this.password,
        },
      });

      return response.data?.districts || [];
    } catch (error: any) {
      this.logger.error(`Failed to get district list: ${error.message}`);
      return [];
    }
  }

  async calculatePrice(request: {
    originCity: string;
    destinationCity: string;
    weight: number;
    desi: number;
    serviceType: string;
  }): Promise<any> {
    try {
      const response = await this.client.post('/pricing/calculate', {
        username: this.username,
        password: this.password,
        contractNo: this.contractNo,
        originCity: request.originCity,
        destinationCity: request.destinationCity,
        weight: request.weight,
        desi: request.desi,
        serviceType: this.mapServiceType(request.serviceType),
      });

      return {
        success: true,
        price: response.data?.price || 0,
        currency: 'TRY',
        taxIncluded: response.data?.taxIncluded || false,
        deliveryTime: response.data?.estimatedDeliveryDays,
      };
    } catch (error: any) {
      this.logger.error(`PTT price calculation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getBranchList(cityCode: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/branches/${cityCode}`, {
        params: {
          username: this.username,
          password: this.password,
        },
      });

      return response.data?.branches || [];
    } catch (error: any) {
      this.logger.error(`Failed to get branch list: ${error.message}`);
      return [];
    }
  }

  private mapServiceType(type: string): number {
    const mapping: Record<string, number> = {
      'standard': 1,
      'express': 2,
      'economic': 3,
    };
    return mapping[type] || 1;
  }
}

