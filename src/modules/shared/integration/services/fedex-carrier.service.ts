import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface FedExRateRequest {
  origin: {
    postalCode: string;
    countryCode: string;
  };
  destination: {
    postalCode: string;
    countryCode: string;
  };
  packages: Array<{
    weight: number;
    weightUnit: 'KG' | 'LB';
    length: number;
    width: number;
    height: number;
    dimensionUnit: 'CM' | 'IN';
  }>;
  serviceType?: string;
}

interface FedExShipmentRequest {
  shipper: {
    name: string;
    phone: string;
    address: string;
    city: string;
    stateCode: string;
    postalCode: string;
    countryCode: string;
  };
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
    stateCode: string;
    postalCode: string;
    countryCode: string;
  };
  packages: Array<{
    weight: number;
    weightUnit: 'KG' | 'LB';
    length: number;
    width: number;
    height: number;
    dimensionUnit: 'CM' | 'IN';
  }>;
  serviceType: string;
  paymentType: 'sender' | 'recipient' | 'third_party';
}

@Injectable()
export class FedExCarrierService {
  private readonly logger = new Logger(FedExCarrierService.name);
  private readonly client: AxiosInstance;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly accountNumber: string;
  private accessToken: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('FEDEX_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('FEDEX_CLIENT_SECRET') || '';
    this.accountNumber = this.configService.get<string>('FEDEX_ACCOUNT_NUMBER') || '';

    this.client = axios.create({
      baseURL: 'https://apis.fedex.com',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async authenticate(): Promise<void> {
    try {
      const response = await this.client.post('/oauth/token', {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data?.access_token;

      if (this.accessToken) {
        this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
      }
    } catch (error: any) {
      this.logger.error(`FedEx authentication failed: ${error.message}`);
    }
  }

  async getRates(request: FedExRateRequest): Promise<any> {
    try {
      await this.authenticate();

      const payload = {
        accountNumber: {
          value: this.accountNumber,
        },
        requestedShipment: {
          shipper: {
            address: {
              postalCode: request.origin.postalCode,
              countryCode: request.origin.countryCode,
            },
          },
          recipient: {
            address: {
              postalCode: request.destination.postalCode,
              countryCode: request.destination.countryCode,
            },
          },
          pickupType: 'USE_SCHEDULED_PICKUP',
          rateRequestType: ['LIST', 'ACCOUNT'],
          requestedPackageLineItems: request.packages.map(pkg => ({
            weight: {
              units: pkg.weightUnit,
              value: pkg.weight,
            },
            dimensions: {
              length: pkg.length,
              width: pkg.width,
              height: pkg.height,
              units: pkg.dimensionUnit,
            },
          })),
        },
      };

      const response = await this.client.post('/rate/v1/rates/quotes', payload);

      return {
        success: true,
        carrier: 'FedEx',
        rates: response.data?.output?.rateReplyDetails?.map((rate: any) => ({
          service: rate.serviceType,
          serviceName: rate.serviceName,
          totalCharge: parseFloat(rate.ratedShipmentDetails?.[0]?.totalNetCharge || '0'),
          currency: rate.ratedShipmentDetails?.[0]?.currency || 'USD',
          deliveryDate: rate.commit?.dateDetail?.dayFormat,
        })) || [],
      };
    } catch (error: any) {
      this.logger.error(`FedEx rate request failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.message || error.message,
      };
    }
  }

  async createShipment(request: FedExShipmentRequest, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating FedEx shipment for tenant ${tenantId}`);

      await this.authenticate();

      const payload = {
        accountNumber: {
          value: this.accountNumber,
        },
        requestedShipment: {
          shipper: {
            contact: {
              personName: request.shipper.name,
              phoneNumber: request.shipper.phone,
            },
            address: {
              streetLines: [request.shipper.address],
              city: request.shipper.city,
              stateOrProvinceCode: request.shipper.stateCode,
              postalCode: request.shipper.postalCode,
              countryCode: request.shipper.countryCode,
            },
          },
          recipients: [
            {
              contact: {
                personName: request.recipient.name,
                phoneNumber: request.recipient.phone,
              },
              address: {
                streetLines: [request.recipient.address],
                city: request.recipient.city,
                stateOrProvinceCode: request.recipient.stateCode,
                postalCode: request.recipient.postalCode,
                countryCode: request.recipient.countryCode,
              },
            },
          ],
          serviceType: request.serviceType,
          packagingType: 'YOUR_PACKAGING',
          pickupType: 'USE_SCHEDULED_PICKUP',
          requestedPackageLineItems: request.packages.map(pkg => ({
            weight: {
              units: pkg.weightUnit,
              value: pkg.weight,
            },
            dimensions: {
              length: pkg.length,
              width: pkg.width,
              height: pkg.height,
              units: pkg.dimensionUnit,
            },
          })),
          shippingChargesPayment: {
            paymentType: request.paymentType === 'sender' ? 'SENDER' : 'RECIPIENT',
          },
          labelSpecification: {
            labelFormatType: 'COMMON2D',
            imageType: 'PDF',
          },
        },
      };

      const response = await this.client.post('/ship/v1/shipments', payload);

      const shipment = response.data?.output?.transactionShipments?.[0];

      return {
        success: true,
        carrier: 'FedEx',
        trackingNumber: shipment?.masterTrackingNumber,
        labelUrl: shipment?.pieceResponses?.[0]?.packageDocuments?.[0]?.url,
        shipmentId: shipment?.shipmentDocuments?.[0]?.trackingNumber,
      };
    } catch (error: any) {
      this.logger.error(`FedEx shipment creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.message || error.message,
      };
    }
  }

  async trackShipment(trackingNumber: string): Promise<any> {
    try {
      await this.authenticate();

      const response = await this.client.post('/track/v1/trackingnumbers', {
        trackingInfo: [
          {
            trackingNumberInfo: {
              trackingNumber,
            },
          },
        ],
        includeDetailedScans: true,
      });

      const track = response.data?.output?.completeTrackResults?.[0]?.trackResults?.[0];

      return {
        trackingNumber,
        carrier: 'FedEx',
        status: track?.latestStatusDetail?.description || 'Unknown',
        statusCode: track?.latestStatusDetail?.code,
        events: track?.scanEvents?.map((event: any) => ({
          timestamp: event.date,
          location: `${event.scanLocation?.city || ''}, ${event.scanLocation?.stateOrProvinceCode || ''}`,
          description: event.eventDescription || '',
        })) || [],
        estimatedDelivery: track?.estimatedDeliveryTimeWindow?.window?.ends,
      };
    } catch (error: any) {
      this.logger.error(`FedEx tracking failed: ${error.message}`);
      return null;
    }
  }

  async cancelShipment(trackingNumber: string, tenantId: string): Promise<boolean> {
    try {
      await this.authenticate();

      await this.client.put('/ship/v1/shipments/cancel', {
        accountNumber: {
          value: this.accountNumber,
        },
        trackingNumber,
      });

      return true;
    } catch (error: any) {
      this.logger.error(`FedEx cancellation failed: ${error.message}`);
      return false;
    }
  }

  private getServiceName(code: string): string {
    const services: Record<string, string> = {
      'FEDEX_GROUND': 'FedEx Ground',
      'FEDEX_EXPRESS_SAVER': 'FedEx Express Saver',
      'FEDEX_2_DAY': 'FedEx 2Day',
      'PRIORITY_OVERNIGHT': 'FedEx Priority Overnight',
      'STANDARD_OVERNIGHT': 'FedEx Standard Overnight',
      'FIRST_OVERNIGHT': 'FedEx First Overnight',
      'INTERNATIONAL_ECONOMY': 'FedEx International Economy',
      'INTERNATIONAL_PRIORITY': 'FedEx International Priority',
    };

    return services[code] || code;
  }
}

