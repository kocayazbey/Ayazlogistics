import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface UPSRateRequest {
  originAddress: {
    city: string;
    stateCode: string;
    postalCode: string;
    countryCode: string;
  };
  destinationAddress: {
    city: string;
    stateCode: string;
    postalCode: string;
    countryCode: string;
  };
  packages: Array<{
    weight: number;
    weightUnit: 'LBS' | 'KGS';
    length: number;
    width: number;
    height: number;
    dimensionUnit: 'IN' | 'CM';
  }>;
  serviceCode?: string;
}

interface UPSShipmentRequest {
  shipper: {
    name: string;
    phone: string;
    address: string;
    city: string;
    stateCode: string;
    postalCode: string;
    countryCode: string;
  };
  shipTo: {
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
    weightUnit: 'LBS' | 'KGS';
    length: number;
    width: number;
    height: number;
    dimensionUnit: 'IN' | 'CM';
    description?: string;
  }>;
  serviceCode: string;
  paymentType: 'sender' | 'receiver' | 'third_party';
  reference?: string;
}

@Injectable()
export class UPSCarrierService {
  private readonly logger = new Logger(UPSCarrierService.name);
  private readonly client: AxiosInstance;
  private readonly accessToken: string;
  private readonly accountNumber: string;

  constructor(private readonly configService: ConfigService) {
    const clientId = this.configService.get<string>('UPS_CLIENT_ID') || '';
    const clientSecret = this.configService.get<string>('UPS_CLIENT_SECRET') || '';
    this.accountNumber = this.configService.get<string>('UPS_ACCOUNT_NUMBER') || '';

    this.accessToken = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    this.client = axios.create({
      baseURL: 'https://onlinetools.ups.com/api',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this.accessToken}`,
      },
      timeout: 30000,
    });
  }

  async getRates(request: UPSRateRequest): Promise<any> {
    try {
      const payload = {
        RateRequest: {
          Request: {
            TransactionReference: {
              CustomerContext: `Rating ${Date.now()}`,
            },
          },
          Shipment: {
            Shipper: {
              Address: {
                City: request.originAddress.city,
                StateProvinceCode: request.originAddress.stateCode,
                PostalCode: request.originAddress.postalCode,
                CountryCode: request.originAddress.countryCode,
              },
            },
            ShipTo: {
              Address: {
                City: request.destinationAddress.city,
                StateProvinceCode: request.destinationAddress.stateCode,
                PostalCode: request.destinationAddress.postalCode,
                CountryCode: request.destinationAddress.countryCode,
              },
            },
            Package: request.packages.map(pkg => ({
              PackagingType: {
                Code: '02',
              },
              Dimensions: {
                UnitOfMeasurement: {
                  Code: pkg.dimensionUnit,
                },
                Length: pkg.length.toString(),
                Width: pkg.width.toString(),
                Height: pkg.height.toString(),
              },
              PackageWeight: {
                UnitOfMeasurement: {
                  Code: pkg.weightUnit,
                },
                Weight: pkg.weight.toString(),
              },
            })),
          },
        },
      };

      const response = await this.client.post('/rating/v1/rate', payload);

      return {
        success: true,
        carrier: 'UPS',
        rates: response.data?.RateResponse?.RatedShipment?.map((rate: any) => ({
          service: rate.Service?.Code,
          serviceName: this.getServiceName(rate.Service?.Code),
          totalCharge: parseFloat(rate.TotalCharges?.MonetaryValue || '0'),
          currency: rate.TotalCharges?.CurrencyCode || 'USD',
        })) || [],
      };
    } catch (error: any) {
      this.logger.error(`UPS rate request failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.response?.errors?.[0]?.message || error.message,
      };
    }
  }

  async createShipment(request: UPSShipmentRequest, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating UPS shipment for tenant ${tenantId}`);

      const payload = {
        ShipmentRequest: {
          Shipment: {
            Shipper: {
              Name: request.shipper.name,
              Phone: { Number: request.shipper.phone },
              ShipperNumber: this.accountNumber,
              Address: {
                AddressLine: request.shipper.address,
                City: request.shipper.city,
                StateProvinceCode: request.shipper.stateCode,
                PostalCode: request.shipper.postalCode,
                CountryCode: request.shipper.countryCode,
              },
            },
            ShipTo: {
              Name: request.shipTo.name,
              Phone: { Number: request.shipTo.phone },
              Address: {
                AddressLine: request.shipTo.address,
                City: request.shipTo.city,
                StateProvinceCode: request.shipTo.stateCode,
                PostalCode: request.shipTo.postalCode,
                CountryCode: request.shipTo.countryCode,
              },
            },
            Service: {
              Code: request.serviceCode,
            },
            PaymentInformation: {
              ShipmentCharge: {
                Type: request.paymentType === 'sender' ? '01' : '02',
                BillShipper: request.paymentType === 'sender' ? {
                  AccountNumber: this.accountNumber,
                } : undefined,
              },
            },
            Package: request.packages.map((pkg, idx) => ({
              Packaging: {
                Code: '02',
              },
              Dimensions: {
                UnitOfMeasurement: { Code: pkg.dimensionUnit },
                Length: pkg.length.toString(),
                Width: pkg.width.toString(),
                Height: pkg.height.toString(),
              },
              PackageWeight: {
                UnitOfMeasurement: { Code: pkg.weightUnit },
                Weight: pkg.weight.toString(),
              },
              Description: pkg.description || 'Package',
            })),
          },
          LabelSpecification: {
            LabelImageFormat: {
              Code: 'PDF',
            },
          },
        },
      };

      const response = await this.client.post('/shipments/v1/ship', payload);

      const shipment = response.data?.ShipmentResponse?.ShipmentResults;

      return {
        success: true,
        carrier: 'UPS',
        trackingNumber: shipment?.PackageResults?.[0]?.TrackingNumber,
        labelUrl: shipment?.PackageResults?.[0]?.ShippingLabel?.GraphicImage,
        shipmentId: shipment?.ShipmentIdentificationNumber,
      };
    } catch (error: any) {
      this.logger.error(`UPS shipment creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.response?.errors?.[0]?.message || error.message,
      };
    }
  }

  async trackShipment(trackingNumber: string): Promise<any> {
    try {
      const response = await this.client.get(`/track/v1/details/${trackingNumber}`);

      const trackInfo = response.data?.trackResponse?.shipment?.[0];

      return {
        trackingNumber,
        carrier: 'UPS',
        status: trackInfo?.package?.[0]?.currentStatus?.description || 'Unknown',
        statusCode: trackInfo?.package?.[0]?.currentStatus?.code,
        events: trackInfo?.package?.[0]?.activity?.map((event: any) => ({
          timestamp: event.date + ' ' + event.time,
          location: event.location?.address?.city || '',
          description: event.status?.description || '',
        })) || [],
        estimatedDelivery: trackInfo?.deliveryDate?.date,
      };
    } catch (error: any) {
      this.logger.error(`UPS tracking failed: ${error.message}`);
      return null;
    }
  }

  async cancelShipment(trackingNumber: string, tenantId: string): Promise<boolean> {
    try {
      await this.client.delete(`/shipments/v1/cancel/${trackingNumber}`);
      return true;
    } catch (error: any) {
      this.logger.error(`UPS cancellation failed: ${error.message}`);
      return false;
    }
  }

  private getServiceName(code: string): string {
    const services: Record<string, string> = {
      '01': 'UPS Next Day Air',
      '02': 'UPS 2nd Day Air',
      '03': 'UPS Ground',
      '07': 'UPS Worldwide Express',
      '08': 'UPS Worldwide Expedited',
      '11': 'UPS Standard',
      '12': 'UPS 3 Day Select',
      '13': 'UPS Next Day Air Saver',
      '14': 'UPS Next Day Air Early',
      '54': 'UPS Worldwide Express Plus',
      '59': 'UPS 2nd Day Air A.M.',
      '65': 'UPS Worldwide Saver',
    };

    return services[code] || 'UPS Service';
  }
}

