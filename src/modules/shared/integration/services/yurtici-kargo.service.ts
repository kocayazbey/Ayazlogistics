import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface YurticiShipmentRequest {
  shipper: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode?: string;
  };
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode?: string;
  };
  packages: Array<{
    weight: number; // kg
    desi: number;
    quantity: number;
    description: string;
  }>;
  paymentType: 'sender' | 'recipient';
  serviceType: 'normal' | 'express' | 'economy';
  deliveryType: 'address' | 'branch';
  invoiceId?: string;
  cargoValue?: number;
}

@Injectable()
export class YurticiKargoService {
  private readonly logger = new Logger(YurticiKargoService.name);
  private readonly client: AxiosInstance;
  private readonly username: string;
  private readonly password: string;
  private readonly customerId: string;

  constructor(private readonly configService: ConfigService) {
    this.username = this.configService.get<string>('YURTICI_USERNAME') || '';
    this.password = this.configService.get<string>('YURTICI_PASSWORD') || '';
    this.customerId = this.configService.get<string>('YURTICI_CUSTOMER_ID') || '';

    this.client = axios.create({
      baseURL: 'https://ws.yurticikargo.com/Services',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
      },
      timeout: 30000,
    });
  }

  async createShipment(request: YurticiShipmentRequest, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating Yurtiçi Kargo shipment for tenant ${tenantId}`);

      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ShippingOrderWithPiecesList xmlns="http://tempuri.org/">
      <wsUserName>${this.username}</wsUserName>
      <wsPassword>${this.password}</wsPassword>
      <wsLanguage>TR</wsLanguage>
      <userLanguage>TR</userLanguage>
      <ShippingOrderVO>
        <cargoKey>0</cargoKey>
        <invoiceKey>0</invoiceKey>
        <receiverCustId>0</receiverCustId>
        <senderCustId>${this.customerId}</senderCustId>
        <receiverAddrText>${request.recipient.address}</receiverAddrText>
        <receiverAddr1>${request.recipient.district}</receiverAddr1>
        <receiverAddr2>${request.recipient.city}</receiverAddr2>
        <cityName>${request.recipient.city}</cityName>
        <townName>${request.recipient.district}</townName>
        <receiverName>${request.recipient.name}</receiverName>
        <receiverPhone1>${request.recipient.phone}</receiverPhone1>
        <receiverPhone2></receiverPhone2>
        <receiverPhone3></receiverPhone3>
        <desi>${request.packages.reduce((sum, pkg) => sum + pkg.desi, 0)}</desi>
        <kg>${request.packages.reduce((sum, pkg) => sum + pkg.weight, 0)}</kg>
        <pieceCount>${request.packages.reduce((sum, pkg) => sum + pkg.quantity, 0)}</pieceCount>
        <cargoValue>${request.cargoValue || 0}</cargoValue>
        <description>${request.packages[0]?.description || 'Genel Kargo'}</description>
        <paymentType>${request.paymentType === 'sender' ? '1' : '2'}</paymentType>
        <deliveryType>${request.deliveryType === 'address' ? '2' : '1'}</deliveryType>
        <serviceType>${this.mapServiceType(request.serviceType)}</serviceType>
      </ShippingOrderVO>
      <PiecesListVO>
        ${request.packages.map((pkg, idx) => `
        <ShippingOrderPieceVO>
          <pieceNumber>${idx + 1}</pieceNumber>
          <desi>${pkg.desi}</desi>
          <kg>${pkg.weight}</kg>
          <pieceCount>${pkg.quantity}</pieceCount>
        </ShippingOrderPieceVO>
        `).join('')}
      </PiecesListVO>
    </ShippingOrderWithPiecesList>
  </soap:Body>
</soap:Envelope>`;

      const response = await this.client.post('/ShippingOrderService.asmx', soapEnvelope, {
        headers: {
          'SOAPAction': 'http://tempuri.org/ShippingOrderWithPiecesList',
        },
      });

      const trackingNumber = this.extractFromXML(response.data, 'outShipmentKey');
      const success = trackingNumber && trackingNumber !== '0';

      if (!success) {
        const errorMsg = this.extractFromXML(response.data, 'errMsg') || 'Unknown error';
        throw new Error(errorMsg);
      }

      return {
        success: true,
        carrier: 'YurticiKargo',
        trackingNumber,
        shipmentId: trackingNumber,
        labelUrl: null, // Yurtiçi Kargo requires separate label request
      };
    } catch (error: any) {
      this.logger.error(`Yurtiçi Kargo shipment creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async trackShipment(trackingNumber: string): Promise<any> {
    try {
      this.logger.debug(`Tracking Yurtiçi Kargo shipment: ${trackingNumber}`);

      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <QueryCargo xmlns="http://tempuri.org/">
      <wsUserName>${this.username}</wsUserName>
      <wsPassword>${this.password}</wsPassword>
      <wsLanguage>TR</wsLanguage>
      <userLanguage>TR</userLanguage>
      <keys>${trackingNumber}</keys>
      <addHistoricalData>1</addHistoricalData>
      <onlyTracking>0</onlyTracking>
      <detailed>1</detailed>
    </QueryCargo>
  </soap:Body>
</soap:Envelope>`;

      const response = await this.client.post('/ShippingOrderService.asmx', soapEnvelope, {
        headers: {
          'SOAPAction': 'http://tempuri.org/QueryCargo',
        },
      });

      const status = this.extractFromXML(response.data, 'lastOperationStatus');
      const events = this.extractTrackingEvents(response.data);

      return {
        trackingNumber,
        carrier: 'YurticiKargo',
        status: status || 'Unknown',
        events,
        estimatedDelivery: null,
      };
    } catch (error: any) {
      this.logger.error(`Yurtiçi Kargo tracking failed: ${error.message}`, error.stack);
      return null;
    }
  }

  async getLabel(trackingNumber: string): Promise<string | null> {
    try {
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetLabel xmlns="http://tempuri.org/">
      <wsUserName>${this.username}</wsUserName>
      <wsPassword>${this.password}</wsPassword>
      <shippingId>${trackingNumber}</shippingId>
    </GetLabel>
  </soap:Body>
</soap:Envelope>`;

      const response = await this.client.post('/ShippingOrderService.asmx', soapEnvelope, {
        headers: {
          'SOAPAction': 'http://tempuri.org/GetLabel',
        },
      });

      const labelBase64 = this.extractFromXML(response.data, 'GetLabelResult');
      return labelBase64;
    } catch (error: any) {
      this.logger.error(`Yurtiçi Kargo label retrieval failed: ${error.message}`);
      return null;
    }
  }

  async cancelShipment(trackingNumber: string, reason: string, tenantId: string): Promise<boolean> {
    try {
      this.logger.log(`Cancelling Yurtiçi Kargo shipment: ${trackingNumber}`);

      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CancelShipment xmlns="http://tempuri.org/">
      <wsUserName>${this.username}</wsUserName>
      <wsPassword>${this.password}</wsPassword>
      <shippingId>${trackingNumber}</shippingId>
      <cancelReason>${reason}</cancelReason>
    </CancelShipment>
  </soap:Body>
</soap:Envelope>`;

      const response = await this.client.post('/ShippingOrderService.asmx', soapEnvelope, {
        headers: {
          'SOAPAction': 'http://tempuri.org/CancelShipment',
        },
      });

      const result = this.extractFromXML(response.data, 'CancelShipmentResult');
      return result === 'true' || result === '1';
    } catch (error: any) {
      this.logger.error(`Yurtiçi Kargo cancellation failed: ${error.message}`);
      return false;
    }
  }

  async getCityList(): Promise<any[]> {
    try {
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetCityList xmlns="http://tempuri.org/">
      <wsUserName>${this.username}</wsUserName>
      <wsPassword>${this.password}</wsPassword>
      <wsLanguage>TR</wsLanguage>
    </GetCityList>
  </soap:Body>
</soap:Envelope>`;

      const response = await this.client.post('/ShippingOrderService.asmx', soapEnvelope, {
        headers: {
          'SOAPAction': 'http://tempuri.org/GetCityList',
        },
      });

      // Parse XML and extract cities
      return this.extractCitiesFromXML(response.data);
    } catch (error: any) {
      this.logger.error(`Failed to get city list: ${error.message}`);
      return [];
    }
  }

  async getDistrictList(cityCode: string): Promise<any[]> {
    try {
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetDistrictList xmlns="http://tempuri.org/">
      <wsUserName>${this.username}</wsUserName>
      <wsPassword>${this.password}</wsPassword>
      <wsLanguage>TR</wsLanguage>
      <cityCode>${cityCode}</cityCode>
    </GetDistrictList>
  </soap:Body>
</soap:Envelope>`;

      const response = await this.client.post('/ShippingOrderService.asmx', soapEnvelope, {
        headers: {
          'SOAPAction': 'http://tempuri.org/GetDistrictList',
        },
      });

      return this.extractDistrictsFromXML(response.data);
    } catch (error: any) {
      this.logger.error(`Failed to get district list: ${error.message}`);
      return [];
    }
  }

  private mapServiceType(type: string): string {
    const mapping: Record<string, string> = {
      'normal': '2',
      'express': '1',
      'economy': '3',
    };
    return mapping[type] || '2';
  }

  private extractFromXML(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
  }

  private extractTrackingEvents(xml: string): any[] {
    const events: any[] = [];
    // Basic XML parsing for tracking events
    const eventRegex = /<ShippingOrderHistoryVO>(.*?)<\/ShippingOrderHistoryVO>/gs;
    const matches = xml.matchAll(eventRegex);

    for (const match of matches) {
      const eventXml = match[1];
      events.push({
        timestamp: this.extractFromXML(eventXml, 'operationDate') || '',
        location: this.extractFromXML(eventXml, 'branchName') || '',
        description: this.extractFromXML(eventXml, 'operationDescription') || '',
      });
    }

    return events;
  }

  private extractCitiesFromXML(xml: string): any[] {
    const cities: any[] = [];
    const cityRegex = /<CityVO>(.*?)<\/CityVO>/gs;
    const matches = xml.matchAll(cityRegex);

    for (const match of matches) {
      const cityXml = match[1];
      cities.push({
        code: this.extractFromXML(cityXml, 'cityCode'),
        name: this.extractFromXML(cityXml, 'cityName'),
      });
    }

    return cities;
  }

  private extractDistrictsFromXML(xml: string): any[] {
    const districts: any[] = [];
    const districtRegex = /<DistrictVO>(.*?)<\/DistrictVO>/gs;
    const matches = xml.matchAll(districtRegex);

    for (const match of matches) {
      const districtXml = match[1];
      districts.push({
        code: this.extractFromXML(districtXml, 'districtCode'),
        name: this.extractFromXML(districtXml, 'districtName'),
      });
    }

    return districts;
  }
}

