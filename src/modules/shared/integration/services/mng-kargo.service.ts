import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface MNGShipmentRequest {
  shipper: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
  };
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
  };
  packages: Array<{
    weight: number;
    desi: number;
    quantity: number;
    description: string;
  }>;
  paymentType: 'sender' | 'recipient';
  serviceType: 'standard' | 'express';
  invoiceNo?: string;
  referenceNo?: string;
}

@Injectable()
export class MNGKargoService {
  private readonly logger = new Logger(MNGKargoService.name);
  private readonly client: AxiosInstance;
  private readonly username: string;
  private readonly password: string;
  private readonly customerCode: string;

  constructor(private readonly configService: ConfigService) {
    this.username = this.configService.get<string>('MNG_USERNAME') || '';
    this.password = this.configService.get<string>('MNG_PASSWORD') || '';
    this.customerCode = this.configService.get<string>('MNG_CUSTOMER_CODE') || '';

    this.client = axios.create({
      baseURL: 'https://customer.mngkargo.com.tr/MngwebservicesV2',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
      },
      timeout: 30000,
    });
  }

  async createShipment(request: MNGShipmentRequest, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating MNG Kargo shipment for tenant ${tenantId}`);

      const totalWeight = request.packages.reduce((sum, pkg) => sum + pkg.weight, 0);
      const totalDesi = request.packages.reduce((sum, pkg) => sum + pkg.desi, 0);
      const totalQuantity = request.packages.reduce((sum, pkg) => sum + pkg.quantity, 0);

      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <AuthenticationHeader xmlns="http://tempuri.org/">
      <strUserName>${this.username}</strUserName>
      <strPassword>${this.password}</strPassword>
    </AuthenticationHeader>
  </soap:Header>
  <soap:Body>
    <createOrder xmlns="http://tempuri.org/">
      <deliveryOrder>
        <customerCode>${this.customerCode}</customerCode>
        <referenceNo>${request.referenceNo || Date.now()}</referenceNo>
        <invoiceNo>${request.invoiceNo || ''}</invoiceNo>
        <billToCode>${request.paymentType === 'sender' ? this.customerCode : ''}</billToCode>
        <gonderenAdi>${request.shipper.name}</gonderenAdi>
        <gonderenTelefon>${request.shipper.phone}</gonderenTelefon>
        <gonderenAdres>${request.shipper.address}</gonderenAdres>
        <gonderenIl>${request.shipper.city}</gonderenIl>
        <gonderenIlce>${request.shipper.district}</gonderenIlce>
        <aliciAdi>${request.recipient.name}</aliciAdi>
        <aliciTelefon>${request.recipient.phone}</aliciTelefon>
        <aliciAdres>${request.recipient.address}</aliciAdres>
        <aliciIl>${request.recipient.city}</aliciIl>
        <aliciIlce>${request.recipient.district}</aliciIlce>
        <parcaSayisi>${totalQuantity}</parcaSayisi>
        <agirlik>${totalWeight}</agirlik>
        <desi>${totalDesi}</desi>
        <urunIcerigi>${request.packages[0]?.description || 'Genel Kargo'}</urunIcerigi>
        <servisTipi>${request.serviceType === 'express' ? '1' : '2'}</servisTipi>
        <odemeKodu>${request.paymentType === 'sender' ? '1' : '2'}</odemeKodu>
      </deliveryOrder>
    </createOrder>
  </soap:Body>
</soap:Envelope>`;

      const response = await this.client.post('/MngwebservicesV2.asmx', soapEnvelope, {
        headers: {
          'SOAPAction': 'http://tempuri.org/createOrder',
        },
      });

      const trackingNumber = this.extractFromXML(response.data, 'shipmentNumber');
      const barcode = this.extractFromXML(response.data, 'barcode');
      const success = trackingNumber && trackingNumber !== '0';

      if (!success) {
        const errorMsg = this.extractFromXML(response.data, 'errorMessage') || 'Unknown error';
        throw new Error(errorMsg);
      }

      return {
        success: true,
        carrier: 'MNGKargo',
        trackingNumber,
        barcode,
        shipmentId: trackingNumber,
        labelUrl: null,
      };
    } catch (error: any) {
      this.logger.error(`MNG Kargo shipment creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async trackShipment(trackingNumber: string): Promise<any> {
    try {
      this.logger.debug(`Tracking MNG Kargo shipment: ${trackingNumber}`);

      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <AuthenticationHeader xmlns="http://tempuri.org/">
      <strUserName>${this.username}</strUserName>
      <strPassword>${this.password}</strPassword>
    </AuthenticationHeader>
  </soap:Header>
  <soap:Body>
    <orderTracking xmlns="http://tempuri.org/">
      <referenceNumber>${trackingNumber}</referenceNumber>
    </orderTracking>
  </soap:Body>
</soap:Envelope>`;

      const response = await this.client.post('/MngwebservicesV2.asmx', soapEnvelope, {
        headers: {
          'SOAPAction': 'http://tempuri.org/orderTracking',
        },
      });

      const status = this.extractFromXML(response.data, 'currentStatus');
      const events = this.extractTrackingEvents(response.data);

      return {
        trackingNumber,
        carrier: 'MNGKargo',
        status: status || 'Unknown',
        events,
        estimatedDelivery: null,
      };
    } catch (error: any) {
      this.logger.error(`MNG Kargo tracking failed: ${error.message}`, error.stack);
      return null;
    }
  }

  async getLabel(trackingNumber: string): Promise<string | null> {
    try {
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <AuthenticationHeader xmlns="http://tempuri.org/">
      <strUserName>${this.username}</strUserName>
      <strPassword>${this.password}</strPassword>
    </AuthenticationHeader>
  </soap:Header>
  <soap:Body>
    <getPrintData xmlns="http://tempuri.org/">
      <shipmentNumber>${trackingNumber}</shipmentNumber>
    </getPrintData>
  </soap:Body>
</soap:Envelope>`;

      const response = await this.client.post('/MngwebservicesV2.asmx', soapEnvelope, {
        headers: {
          'SOAPAction': 'http://tempuri.org/getPrintData',
        },
      });

      const labelBase64 = this.extractFromXML(response.data, 'getPrintDataResult');
      return labelBase64;
    } catch (error: any) {
      this.logger.error(`MNG Kargo label retrieval failed: ${error.message}`);
      return null;
    }
  }

  async cancelShipment(trackingNumber: string, tenantId: string): Promise<boolean> {
    try {
      this.logger.log(`Cancelling MNG Kargo shipment: ${trackingNumber}`);

      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <AuthenticationHeader xmlns="http://tempuri.org/">
      <strUserName>${this.username}</strUserName>
      <strPassword>${this.password}</strPassword>
    </AuthenticationHeader>
  </soap:Header>
  <soap:Body>
    <cancelOrder xmlns="http://tempuri.org/">
      <shipmentNumber>${trackingNumber}</shipmentNumber>
    </cancelOrder>
  </soap:Body>
</soap:Envelope>`;

      const response = await this.client.post('/MngwebservicesV2.asmx', soapEnvelope, {
        headers: {
          'SOAPAction': 'http://tempuri.org/cancelOrder',
        },
      });

      const result = this.extractFromXML(response.data, 'cancelOrderResult');
      return result === 'true' || result === '1' || result?.toLowerCase() === 'success';
    } catch (error: any) {
      this.logger.error(`MNG Kargo cancellation failed: ${error.message}`);
      return false;
    }
  }

  async getCityList(): Promise<any[]> {
    try {
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <AuthenticationHeader xmlns="http://tempuri.org/">
      <strUserName>${this.username}</strUserName>
      <strPassword>${this.password}</strPassword>
    </AuthenticationHeader>
  </soap:Header>
  <soap:Body>
    <getCityList xmlns="http://tempuri.org/"/>
  </soap:Body>
</soap:Envelope>`;

      const response = await this.client.post('/MngwebservicesV2.asmx', soapEnvelope, {
        headers: {
          'SOAPAction': 'http://tempuri.org/getCityList',
        },
      });

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
  <soap:Header>
    <AuthenticationHeader xmlns="http://tempuri.org/">
      <strUserName>${this.username}</strUserName>
      <strPassword>${this.password}</strPassword>
    </AuthenticationHeader>
  </soap:Header>
  <soap:Body>
    <getDistrictList xmlns="http://tempuri.org/">
      <cityCode>${cityCode}</cityCode>
    </getDistrictList>
  </soap:Body>
</soap:Envelope>`;

      const response = await this.client.post('/MngwebservicesV2.asmx', soapEnvelope, {
        headers: {
          'SOAPAction': 'http://tempuri.org/getDistrictList',
        },
      });

      return this.extractDistrictsFromXML(response.data);
    } catch (error: any) {
      this.logger.error(`Failed to get district list: ${error.message}`);
      return [];
    }
  }

  private extractFromXML(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
  }

  private extractTrackingEvents(xml: string): any[] {
    const events: any[] = [];
    const eventRegex = /<TrackingInfo>(.*?)<\/TrackingInfo>/gs;
    const matches = xml.matchAll(eventRegex);

    for (const match of matches) {
      const eventXml = match[1];
      events.push({
        timestamp: this.extractFromXML(eventXml, 'transactionDate') || '',
        location: this.extractFromXML(eventXml, 'locationName') || '',
        description: this.extractFromXML(eventXml, 'statusDescription') || '',
      });
    }

    return events;
  }

  private extractCitiesFromXML(xml: string): any[] {
    const cities: any[] = [];
    const cityRegex = /<City>(.*?)<\/City>/gs;
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
    const districtRegex = /<District>(.*?)<\/District>/gs;
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

