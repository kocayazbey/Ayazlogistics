import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface DHLRateRequest {
  originCountryCode: string;
  originPostalCode: string;
  destinationCountryCode: string;
  destinationPostalCode: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  currency?: string;
}

interface DHLShipmentRequest {
  shipper: {
    name: string;
    company?: string;
    address: string;
    city: string;
    postalCode: string;
    countryCode: string;
    phone: string;
    email?: string;
  };
  recipient: {
    name: string;
    company?: string;
    address: string;
    city: string;
    postalCode: string;
    countryCode: string;
    phone: string;
    email?: string;
  };
  packages: Array<{
    weight: number;
    length: number;
    width: number;
    height: number;
    description?: string;
  }>;
  serviceType: string;
  paymentType: 'sender' | 'recipient' | 'third_party';
  references?: string[];
}

interface DHLTrackingResponse {
  trackingNumber: string;
  status: string;
  statusCode: string;
  events: Array<{
    timestamp: string;
    location: string;
    description: string;
    statusCode: string;
  }>;
  estimatedDelivery?: string;
  actualDelivery?: string;
}

@Injectable()
export class DHLCarrierService {
  private readonly logger = new Logger(DHLCarrierService.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private readonly accountNumber: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DHL_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('DHL_API_SECRET') || '';
    this.accountNumber = this.configService.get<string>('DHL_ACCOUNT_NUMBER') || '';
    this.baseUrl = this.configService.get<string>('DHL_API_URL') || 'https://api-eu.dhl.com';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: this.apiKey,
        password: this.apiSecret,
      },
      timeout: 30000,
    });
  }

  async getRates(request: DHLRateRequest): Promise<any> {
    try {
      this.logger.debug(`Getting DHL rates for ${request.originCountryCode} to ${request.destinationCountryCode}`);

      const payload = {
        customerDetails: {
          shipperDetails: {
            postalCode: request.originPostalCode,
            cityName: '',
            countryCode: request.originCountryCode,
          },
          receiverDetails: {
            postalCode: request.destinationPostalCode,
            cityName: '',
            countryCode: request.destinationCountryCode,
          },
        },
        accounts: [
          {
            typeCode: 'shipper',
            number: this.accountNumber,
          },
        ],
        productCode: '',
        localProductCode: '',
        valueAddedServices: [],
        payerCountryCode: request.originCountryCode,
        plannedShippingDateAndTime: new Date().toISOString(),
        unitOfMeasurement: 'metric',
        isCustomsDeclarable: request.originCountryCode !== request.destinationCountryCode,
        monetaryAmount: [],
        packages: [
          {
            weight: request.weight,
            dimensions: {
              length: request.length,
              width: request.width,
              height: request.height,
            },
          },
        ],
      };

      const response = await this.client.post('/rates', payload);

      return {
        success: true,
        carrier: 'DHL',
        rates: response.data.products?.map((product: any) => ({
          service: product.productName,
          serviceCode: product.productCode,
          totalCharge: parseFloat(product.totalPrice?.[0]?.price || '0'),
          currency: product.totalPrice?.[0]?.priceCurrency || request.currency || 'EUR',
          deliveryTime: product.deliveryCapabilities?.totalTransitTime || 'N/A',
          deliveryDate: product.deliveryCapabilities?.estimatedDeliveryDateAndTime,
        })) || [],
      };
    } catch (error: any) {
      this.logger.error(`DHL rate request failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async createShipment(request: DHLShipmentRequest, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating DHL shipment for tenant ${tenantId}`);

      const payload = {
        plannedShippingDateAndTime: new Date().toISOString(),
        pickup: {
          isRequested: false,
        },
        productCode: request.serviceType || 'P',
        accounts: [
          {
            typeCode: 'shipper',
            number: this.accountNumber,
          },
        ],
        customerDetails: {
          shipperDetails: {
            postalAddress: {
              postalCode: request.shipper.postalCode,
              cityName: request.shipper.city,
              countryCode: request.shipper.countryCode,
              addressLine1: request.shipper.address,
            },
            contactInformation: {
              email: request.shipper.email || '',
              phone: request.shipper.phone,
              companyName: request.shipper.company || request.shipper.name,
              fullName: request.shipper.name,
            },
          },
          receiverDetails: {
            postalAddress: {
              postalCode: request.recipient.postalCode,
              cityName: request.recipient.city,
              countryCode: request.recipient.countryCode,
              addressLine1: request.recipient.address,
            },
            contactInformation: {
              email: request.recipient.email || '',
              phone: request.recipient.phone,
              companyName: request.recipient.company || request.recipient.name,
              fullName: request.recipient.name,
            },
          },
        },
        content: {
          packages: request.packages.map((pkg, index) => ({
            weight: pkg.weight,
            dimensions: {
              length: pkg.length,
              width: pkg.width,
              height: pkg.height,
            },
            customerReferences: request.references || [],
            description: pkg.description || 'General Goods',
          })),
          isCustomsDeclarable: request.shipper.countryCode !== request.recipient.countryCode,
          description: 'Shipment',
          incoterm: 'DAP',
          unitOfMeasurement: 'metric',
        },
        outputImageProperties: {
          imageOptions: [
            {
              typeCode: 'label',
              imageFormat: 'PDF',
              isRequested: true,
            },
          ],
        },
      };

      const response = await this.client.post('/shipments', payload);

      const shipmentData = response.data.shipmentTrackingNumber 
        ? response.data 
        : response.data.shipments?.[0];

      return {
        success: true,
        carrier: 'DHL',
        trackingNumber: shipmentData?.shipmentTrackingNumber,
        labelUrl: shipmentData?.documents?.[0]?.content,
        labelFormat: 'PDF',
        shipmentId: shipmentData?.shipmentTrackingNumber,
        charges: {
          total: parseFloat(shipmentData?.shipmentCharges?.[0]?.price || '0'),
          currency: shipmentData?.shipmentCharges?.[0]?.priceCurrency || 'EUR',
        },
      };
    } catch (error: any) {
      this.logger.error(`DHL shipment creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async trackShipment(trackingNumber: string): Promise<DHLTrackingResponse | null> {
    try {
      this.logger.debug(`Tracking DHL shipment: ${trackingNumber}`);

      const response = await this.client.get(`/track/shipments`, {
        params: {
          trackingNumber,
        },
      });

      const shipment = response.data.shipments?.[0];

      if (!shipment) {
        return null;
      }

      return {
        trackingNumber,
        status: shipment.status?.description || 'Unknown',
        statusCode: shipment.status?.statusCode || '',
        events: shipment.events?.map((event: any) => ({
          timestamp: event.timestamp,
          location: `${event.location?.address?.addressLocality || ''}, ${event.location?.address?.countryCode || ''}`,
          description: event.description || '',
          statusCode: event.statusCode || '',
        })) || [],
        estimatedDelivery: shipment.estimatedTimeOfDelivery,
        actualDelivery: shipment.status?.statusCode === 'delivered' ? shipment.events?.[0]?.timestamp : undefined,
      };
    } catch (error: any) {
      this.logger.error(`DHL tracking failed: ${error.message}`, error.stack);
      return null;
    }
  }

  async cancelShipment(trackingNumber: string, tenantId: string): Promise<boolean> {
    try {
      this.logger.log(`Cancelling DHL shipment: ${trackingNumber} for tenant ${tenantId}`);

      await this.client.delete(`/shipments/${trackingNumber}`);

      return true;
    } catch (error: any) {
      this.logger.error(`DHL cancellation failed: ${error.message}`, error.stack);
      return false;
    }
  }

  async getPickupAvailability(
    countryCode: string,
    postalCode: string,
    date: Date,
  ): Promise<any> {
    try {
      const response = await this.client.get('/pickup/availability', {
        params: {
          countryCode,
          postalCode,
          pickupDate: date.toISOString().split('T')[0],
        },
      });

      return {
        success: true,
        available: response.data.available || false,
        timeSlots: response.data.timeSlots || [],
      };
    } catch (error: any) {
      this.logger.error(`DHL pickup availability check failed: ${error.message}`);
      return {
        success: false,
        available: false,
        error: error.message,
      };
    }
  }

  async schedulePickup(pickupData: {
    date: Date;
    timeSlot: string;
    address: any;
    packages: any[];
    contactPerson: string;
    phone: string;
  }): Promise<any> {
    try {
      const response = await this.client.post('/pickup', {
        pickupDate: pickupData.date.toISOString().split('T')[0],
        pickupTime: pickupData.timeSlot,
        pickupAddress: pickupData.address,
        packages: pickupData.packages,
        contactPerson: pickupData.contactPerson,
        phoneNumber: pickupData.phone,
      });

      return {
        success: true,
        pickupId: response.data.pickupId,
        confirmationNumber: response.data.confirmationNumber,
      };
    } catch (error: any) {
      this.logger.error(`DHL pickup scheduling failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

